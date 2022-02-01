use hex_literal::hex;
use neon::{prelude::*};
use ore_encoding_rs::OreRange;
use ore_encoding_rs::encode_between;
use ore_encoding_rs::encode_gt;
use ore_encoding_rs::encode_gte;
use ore_encoding_rs::{encode_lt, encode_lte};
use ore_encoding_rs::encode_eq;
use ore_rs::{scheme::bit2::OREAES128, ORECipher, OREEncrypt};
use ore_encoding_rs::OrePlaintext;
use ore_encoding_rs::siphash;
use unicode_normalization::UnicodeNormalization;
use std::cell::RefCell;
use std::cmp::Ordering;

struct Cipher(OREAES128);

/* Note that this will Drop the Cipher at which point Zeroize will be called
 * from within the ore.rs crate */
impl Finalize for Cipher {}

type BoxedCipher = JsBox<RefCell<Cipher>>;

fn init(mut cx: FunctionContext) -> JsResult<BoxedCipher> {
    let arg0 = cx.argument::<JsBuffer>(0)?;
    let arg1 = cx.argument::<JsBuffer>(1)?;
    let seed = hex!("00010203 04050607");

    let clone_key = |data: neon::borrow::Ref<'_, BinaryData<'_>>| {
        let mut k: [u8; 16] = Default::default();
        let slice = data.as_slice::<u8>();
        if slice.len() != 16 {
            return Err("Invalid key length");
        }
        k.clone_from_slice(data.as_slice::<u8>());
        Ok(k)
    };

    let k1 = cx.borrow(&arg0, clone_key).or_else(|e| cx.throw_error(e))?;
    let k2 = cx.borrow(&arg1, clone_key).or_else(|e| cx.throw_error(e))?;

    let cipher: OREAES128 =
        ORECipher::init(k1, k2, &seed).or_else(|_e| cx.throw_error("Could not init cipher"))?;

    let ore = RefCell::new(Cipher(cipher));

    return Ok(cx.boxed(ore));
}

fn encrypt_num(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input: u64 = cx.argument::<JsNumber>(1)?.value(&mut cx).to_bits();

    let result = input
        .encrypt(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    Ok(JsBuffer::external(&mut cx, result))
}

fn encrypt_num_left(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input: u64 = cx.argument::<JsNumber>(1)?.value(&mut cx).to_bits();

    let result = input
        .encrypt_left(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    Ok(JsBuffer::external(&mut cx, result))
}

fn compare(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let a = cx.argument::<JsBuffer>(0)?;
    let b = cx.argument::<JsBuffer>(1)?;

    let result = cx.borrow(&a, |data_a| {
        let slice_a = data_a.as_slice::<u8>();

        cx.borrow(&b, |data_b| {
            let slice_b = data_b.as_slice::<u8>();
            OREAES128::compare_raw_slices(slice_a, slice_b)
        })
    });

    match result {
        Some(Ordering::Equal) => Ok(cx.number(0)),
        Some(Ordering::Less) => Ok(cx.number(-1)),
        Some(Ordering::Greater) => Ok(cx.number(1)),
        None => cx.throw_error("Comparison failed"),
    }
}

fn encode_num(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let input = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let output = f64::from_bits(OrePlaintext::<u64>::from(input).0);
    Ok(cx.number(output))
}

fn encode_string(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let input = cx.argument::<JsString>(0)?.value(&mut cx);
    // Unicode normalization FTW (NFC)
    //                    👇👇👇
    let normalized = input.nfc().collect::<String>();
    let output = siphash(normalized.as_bytes());
    Ok(cx.number(f64::from_bits(output)))
}

fn encode_buffer(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let input = cx.argument::<JsBuffer>(0)?;

    let result = cx.borrow(&input, |data| {
        let slice = data.as_slice::<u8>();
        if slice.len() != 8 {
            return Err("Invalid buffer length");
        }

        let slice_8_bytes: [u8; 8] = [slice[0], slice[1], slice[2], slice[3], slice[4], slice[5], slice[6], slice[7]];
        Ok(f64::from_ne_bytes(slice_8_bytes))
    })
    .or_else(|e| cx.throw_error(e));

    match result {
        Ok(num) => Ok(cx.number(num)),
        Err(err) => Err(err)
    }
}

fn make_range_object(mut cx: FunctionContext, min: OrePlaintext<u64>, max: OrePlaintext<u64>) -> JsResult<JsObject> {
    let obj = cx.empty_object();
    let js_min = cx.number(f64::from_bits(min.0));
    let js_max = cx.number(f64::from_bits(max.0));
    obj.set(&mut cx, "min", js_min)?;
    obj.set(&mut cx, "max", js_max)?;
    Ok(obj)
}

fn encode_range_lt(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_lt(OrePlaintext(value.value(&mut cx).to_bits()));
    make_range_object(cx, min, max)
}

fn encode_range_lte(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_lte(OrePlaintext(value.value(&mut cx).to_bits()));
    make_range_object(cx, min, max)
}

fn encode_range_gt(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_gt(OrePlaintext(value.value(&mut cx).to_bits()));
    make_range_object(cx, min, max)
}

fn encode_range_gte(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_gte(OrePlaintext(value.value(&mut cx).to_bits()));
    make_range_object(cx, min, max)
}

fn encode_range_eq(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_eq( OrePlaintext(value.value(&mut cx).to_bits()));
    make_range_object(cx, min, max)
}

fn encode_range_between(mut cx: FunctionContext) -> JsResult<JsObject> {
    let value1 = cx.argument::<JsNumber>(0)?;
    let value2 = cx.argument::<JsNumber>(0)?;
    let OreRange{ min, max } = encode_between(
        OrePlaintext(value1.value(&mut cx).to_bits()),
        OrePlaintext(value2.value(&mut cx).to_bits()),
    );
    make_range_object(cx, min, max)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encodeNumber", encode_num)?;
    cx.export_function("encodeString", encode_string)?;
    cx.export_function("encodeBuffer", encode_buffer)?;

    cx.export_function("encodeRangeEq", encode_range_eq)?;
    cx.export_function("encodeRangeGt", encode_range_gt)?;
    cx.export_function("encodeRangeGte", encode_range_gte)?;
    cx.export_function("encodeRangeLt", encode_range_lt)?;
    cx.export_function("encodeRangeLte", encode_range_lte)?;
    cx.export_function("encodeRangeBetween", encode_range_between)?;

    cx.export_function("initCipher", init)?;
    cx.export_function("encrypt", encrypt_num)?;
    cx.export_function("encryptLeft", encrypt_num_left)?;

    cx.export_function("compare", compare)?;
    Ok(())
}
