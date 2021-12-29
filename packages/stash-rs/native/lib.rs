use hex_literal::hex;
use neon::prelude::*;
use ore_rs::{scheme::bit2::OREAES128, CipherText, ORECipher, OREEncrypt, OREError, PlainText};
use std::cell::RefCell;
use std::cmp::Ordering;
mod convert;
use convert::ToOrderedInteger;

#[cfg(test)]
#[macro_use]
extern crate quickcheck;

struct Cipher(OREAES128);

impl Cipher {
    pub fn encrypt(&mut self, v: &PlainText<8>) -> Result<CipherText<OREAES128, 8>, OREError> {
        self.0.encrypt(v)
    }
}

// TODO: Use zeroize to clear values garbage collected from Node
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
        return Ok(k);
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
    let input = cx.argument::<JsNumber>(1)?;

    let result = input
        .value(&mut cx)
        .map_to()
        .encrypt(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    let ct = JsBuffer::external(&mut cx, result);
    return Ok(ct);
}

fn encrypt_num_left(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input = cx.argument::<JsNumber>(1)?;

    let result = input
        .value(&mut cx)
        .to_bits()
        .encrypt_left(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    let ct = JsBuffer::external(&mut cx, result);
    return Ok(ct);
}

/* This currently only supports 8-byte input buffers. ore.rs will be changed to handle arbitrarily
 * sized input slices later which will make this function a bit more flexible. */
fn encrypt_buf(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input = cx.argument::<JsBuffer>(1)?;

    let plaintext = cx
        .borrow(&input, |data| {
            let mut plaintext: PlainText<8> = Default::default();
            let slice = data.as_slice::<u8>();
            if slice.len() != 8 {
                return Err("Invalid plaintext length");
            }
            /* TODO: ORE encrypt should just take a slice of u8 and we can avoid this clone. */
            plaintext.clone_from_slice(slice);
            Ok(plaintext)
        })
        .or_else(|e| cx.throw_error(e))?;

    // TODO: We could implement the encrypt trait(s) for the Plaintext type!
    let result = ore
        .encrypt(&plaintext)
        .or_else(|_: OREError| cx.throw_error("ORE error"))?
        .to_bytes();

    // Looking at the source code, this appears to do an unsafe memory reinterpret (so it is
    // probably fast)
    let ct = JsBuffer::external(&mut cx, result);
    return Ok(ct);
}

fn encrypt_buf_left(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input = cx.argument::<JsBuffer>(1)?;

    let plaintext = cx
        .borrow(&input, |data| {
            let mut plaintext: PlainText<8> = Default::default();
            let slice = data.as_slice::<u8>();
            if slice.len() != 8 {
                return Err("Invalid plaintext length");
            }
            /* TODO: ORE encrypt should just take a slice of u8 and we can avoid this clone. */
            plaintext.clone_from_slice(slice);
            Ok(plaintext)
        })
        .or_else(|e| cx.throw_error(e))?;

    // TODO: We could implement the encrypt trait(s) for the Plaintext type!
    let result = ore
        .encrypt(&plaintext)
        .or_else(|_: OREError| cx.throw_error("ORE error"))?
        .to_bytes();

    // Looking at the source code, this appears to do an unsafe memory reinterpret (so it is
    // probably fast)
    let ct = JsBuffer::external(&mut cx, result);
    return Ok(ct);
}

fn compare(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let a = cx.argument::<JsBuffer>(0)?;
    let b = cx.argument::<JsBuffer>(1)?;

    let result = cx.borrow(&a, |data_a| {
        let slice_a = data_a.as_slice::<u8>();

        cx.borrow(&b, |data_b| {
            let slice_b = data_b.as_slice::<u8>();
            OREAES128::compare_raw_slices(&slice_a, &slice_b)
        })
    });

    match result {
        Some(Ordering::Equal) => Ok(cx.number(0)),
        Some(Ordering::Less) => Ok(cx.number(-1)),
        Some(Ordering::Greater) => Ok(cx.number(1)),
        None => cx.throw_error("Comparison failed"),
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encrypt_buf", encrypt_buf)?;
    cx.export_function("encrypt_num", encrypt_num)?;
    cx.export_function("encrypt_buf_left", encrypt_buf_left)?;
    cx.export_function("encrypt_num_left", encrypt_num_left)?;
    cx.export_function("initCipher", init)?;
    cx.export_function("compare", compare)?;
    Ok(())
}
