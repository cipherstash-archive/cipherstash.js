use hex_literal::hex;
use neon::{prelude::*, result::Throw};
use ore_rs::{scheme::bit2::OREAES128, ORECipher, OREEncrypt, OREError, PlainText};
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
        .encrypt(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    Ok(JsBuffer::external(&mut cx, result))
}

fn encrypt_num_left(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    let input = cx.argument::<JsNumber>(1)?;

    let result = input
        .value(&mut cx)
        .encrypt_left(&mut ore.0)
        .or_else(|_| cx.throw_error("ORE Error"))?
        .to_bytes();

    Ok(JsBuffer::external(&mut cx, result))
}

/* This currently only supports 8-byte input buffers. ore.rs will be changed to handle arbitrarily
 * sized input slices later which will make this function a bit more flexible. */
fn encrypt_buf(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();
    
    let result =
        fetch_plaintext_from_js_buffer::<8>(&mut cx, 1)?
        .encrypt(&mut ore.0)
        .or_else(|_: OREError| cx.throw_error("ORE error"))?
        .to_bytes();

    Ok(JsBuffer::external(&mut cx, result))
}

fn encrypt_buf_left(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let ore = &mut *cipher.borrow_mut();

    let result =
        fetch_plaintext_from_js_buffer::<8>(&mut cx, 1)?
        .encrypt_left(&mut ore.0)
        .or_else(|_: OREError| cx.throw_error("ORE error"))?
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

/* Helper function to extract a plaintext from a JS Buffer */
fn fetch_plaintext_from_js_buffer<const N: usize>(cx: &mut FunctionContext, arg: i32) -> Result<PlainText<N>, Throw> {
    let input = cx.argument::<JsBuffer>(arg)?;

    cx.borrow(&input, |data| {
        let mut plaintext: PlainText<N> = [0; N];
        let slice = data.as_slice::<u8>();
        if slice.len() != N {
            return Err("Invalid plaintext length");
        }
        plaintext.clone_from_slice(slice);
        Ok(plaintext)
    })
    .or_else(|e| cx.throw_error(e))
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
