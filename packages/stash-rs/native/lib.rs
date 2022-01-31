use hex_literal::hex;
use neon::{prelude::*};
use ore_rs::{scheme::bit2::OREAES128, ORECipher, OREEncrypt};
use ore_encoding_rs::OrePlaintext;
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

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encodeNum", encode_num)?;
    cx.export_function("encryptNum", encrypt_num)?;
    cx.export_function("encryptNumLeft", encrypt_num_left)?;
    cx.export_function("initCipher", init)?;
    cx.export_function("compare", compare)?;
    Ok(())
}
