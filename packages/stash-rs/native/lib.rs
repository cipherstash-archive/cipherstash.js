use cipherstash_client::indexer::Indexer as RecordIndexer;
use hex_literal::hex;
use js_sys::Reflect;
use js_sys::Uint8Array;
use ore_encoding_rs::encode_between;
use ore_encoding_rs::encode_eq;
use ore_encoding_rs::encode_gt;
use ore_encoding_rs::encode_gte;
use ore_encoding_rs::siphash;
use ore_encoding_rs::OrePlaintext;
use ore_encoding_rs::OreRange;
use ore_encoding_rs::{encode_lt, encode_lte};
use ore_rs::{scheme::bit2::OREAES128, ORECipher, OREEncrypt};
use std::cmp::Ordering;
use std::convert::TryInto;
use unicode_normalization::UnicodeNormalization;
use wasm_bindgen::JsCast;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Cipher(OREAES128);

#[wasm_bindgen]
pub struct Indexer(RecordIndexer);

type JsResult<T> = Result<T, JsError>;

#[wasm_bindgen]
impl Indexer {
    #[wasm_bindgen(constructor)]
    pub fn new(schema: &[u8]) -> JsResult<Indexer> {
        let indexer = RecordIndexer::decode_from_cbor(schema)?;
        Ok(Indexer(indexer))
    }

    pub fn encrypt(&mut self, record: &[u8]) -> JsResult<js_sys::Uint8Array> {
        let vector = self.0.encrypt_cbor(record)?;
        Ok((&vector[..]).into())
    }
}

#[wasm_bindgen]
impl Cipher {
    #[wasm_bindgen(constructor)]
    pub fn new(k1: Uint8Array, k2: Uint8Array) -> JsResult<Cipher> {
        let seed = hex!("00010203 04050607");

        let cipher: OREAES128 = ORECipher::init(
            clone_key_from_buffer(k1)?,
            clone_key_from_buffer(k2)?,
            &seed,
        )
        .map_err(|_e| JsError::new("Could not init cipher"))?;

        Ok(Cipher(cipher))
    }

    pub fn encrypt(&self, input: Uint8Array) -> JsResult<Uint8Array> {
        let input = u64_from_buffer(&input)?;

        Ok((&input
            .encrypt(&self.0)
            .map_err(|e| JsError::new(&format!("ORE error: {:?}", e)))?
            .to_bytes()[..])
            .into())
    }

    pub fn encrypt_left(&self, input: Uint8Array) -> JsResult<Uint8Array> {
        let input = u64_from_buffer(&input)?;

        Ok((&input
            .encrypt_left(&self.0)
            .map_err(|e| JsError::new(&format!("ORE error: {:?}", e)))?
            .to_bytes()[..])
            .into())
    }
}

fn clone_key_from_buffer(buf: Uint8Array) -> JsResult<[u8; 16]> {
    let slice = buf.to_vec();

    if slice.len() != 16 {
        return Err(JsError::new("Invalid key length"));
    }

    Ok(slice
        .try_into()
        .expect("Expected slice to have length of 16"))
}

#[wasm_bindgen]
pub fn compare(a: Uint8Array, b: Uint8Array) -> JsResult<f64> {
    let slice_a = &a.to_vec();
    let slice_b = &b.to_vec();

    let result = OREAES128::compare_raw_slices(slice_a, slice_b);

    match result {
        Some(Ordering::Equal) => Ok(0.),
        Some(Ordering::Less) => Ok(-1.),
        Some(Ordering::Greater) => Ok(1.),
        None => Err(JsError::new("Comparison failed")),
    }
}

fn u64_from_buffer(buf: &js_sys::Uint8Array) -> Result<u64, JsError> {
    let slice = buf.to_vec();

    if slice.len() != 8 {
        return Err(JsError::new(&format!(
            "Invalid plaintext buffer length {} (expected 8)",
            slice.len()
        )));
    }

    let slice8: [u8; 8] = [
        slice[0], slice[1], slice[2], slice[3], slice[4], slice[5], slice[6], slice[7],
    ];

    Ok(u64::from_ne_bytes(slice8))
}

fn u64_to_buffer(val: u64) -> Uint8Array {
    (&val.to_ne_bytes()[..]).into()
}

#[wasm_bindgen]
pub fn encode_num(input: f64) -> JsResult<Uint8Array> {
    let output = OrePlaintext::<u64>::from(input).0;
    Ok(u64_to_buffer(output))
}

#[wasm_bindgen]
pub fn encode_string(input: String) -> JsResult<Uint8Array> {
    // Unicode normalization FTW (NFC)
    //                    👇👇👇
    let normalized = input.nfc().collect::<String>();
    let output = siphash(normalized.as_bytes());
    Ok(u64_to_buffer(output))
}

#[wasm_bindgen]
pub fn encode_buffer(buffer: Uint8Array) -> JsResult<Uint8Array> {
    let input_slice = buffer.to_vec();

    if input_slice.len() != 8 {
        return Err(JsError::new("Invalid input buffer length"));
    }

    Ok((&input_slice[..]).into())
}

fn make_range_object(min: OrePlaintext<u64>, max: OrePlaintext<u64>) -> JsResult<js_sys::Object> {
    let obj = js_sys::Object::new();

    Reflect::set(&obj, &"min".into(), &u64_to_buffer(min.0))
        .map_err(|e| JsError::new(&format!("Failed to set key min: {:?}", e)))?;
    Reflect::set(&obj, &"max".into(), &u64_to_buffer(max.0))
        .map_err(|e| JsError::new(&format!("Failed to set key max: {:?}", e)))?;

    Ok(obj)
}

/// Get a range-supported plaintext from a certain argument
///
/// The supported arguments from JavaScript are:
///
/// - Number (float64, Date)
/// - Buffer (uint64)
fn get_range_plaintext_from_value(value: JsValue) -> Result<OrePlaintext<u64>, JsError> {
    if let Some(number) = value.dyn_ref::<js_sys::Number>() {
        let val: f64 = number.into();
        Ok(val.into())
    } else if let Some(buffer) = value.dyn_ref::<js_sys::Uint8Array>() {
        Ok(u64_from_buffer(&buffer)?.into())
    } else {
        Err(JsError::new(
            "Expected first argument to be number or buffer",
        ))
    }
}

#[wasm_bindgen]
pub fn encode_range_lt(value: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_lt(get_range_plaintext_from_value(value)?);
    make_range_object(min, max)
}

#[wasm_bindgen]
pub fn encode_range_lte(value: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_lte(get_range_plaintext_from_value(value)?);
    make_range_object(min, max)
}

#[wasm_bindgen]
pub fn encode_range_gt(value: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_gt(get_range_plaintext_from_value(value)?);
    make_range_object(min, max)
}

#[wasm_bindgen]
pub fn encode_range_gte(value: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_gte(get_range_plaintext_from_value(value)?);
    make_range_object(min, max)
}

#[wasm_bindgen]
pub fn encode_range_eq(value: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_eq(get_range_plaintext_from_value(value)?);
    make_range_object(min, max)
}

#[wasm_bindgen]
pub fn encode_range_between(min: JsValue, max: JsValue) -> JsResult<js_sys::Object> {
    let OreRange { min, max } = encode_between(
        get_range_plaintext_from_value(min)?,
        get_range_plaintext_from_value(max)?,
    );
    make_range_object(min, max)
}

// #[neon::main]
// fn main(mut cx: ModuleContext) -> NeonResult<()> {
//     cx.export_function("encodeNumber", encode_num)?;
//     cx.export_function("encodeString", encode_string)?;
//     cx.export_function("encodeBuffer", encode_buffer)?;
//
//     cx.export_function("encodeRangeEq", encode_range_eq)?;
//     cx.export_function("encodeRangeGt", encode_range_gt)?;
//     cx.export_function("encodeRangeGte", encode_range_gte)?;
//     cx.export_function("encodeRangeLt", encode_range_lt)?;
//     cx.export_function("encodeRangeLte", encode_range_lte)?;
//     cx.export_function("encodeRangeBetween", encode_range_between)?;
//
//     cx.export_function("initCipher", init_cipher)?;
//     cx.export_function("encrypt", encrypt)?;
//     cx.export_function("encryptLeft", encrypt_left)?;
//
//     cx.export_function("initIndexer", init_indexer)?;
//     cx.export_function("encryptRecord", encrypt_record)?;
//
//     cx.export_function("compare", compare)?;
//     Ok(())
// }
