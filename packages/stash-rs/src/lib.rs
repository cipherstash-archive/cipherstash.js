use neon::prelude::*;
use ore_rs::{PlainText, ORECipher, OREError, scheme::bit2::OREAES128};
use hex_literal::hex;
use std::cell::RefCell;

struct Cipher(OREAES128);

// TODO: Use zeroize to clear values garbage collected from Node
impl Finalize for Cipher {}

type BoxedCipher = JsBox<RefCell<Cipher>>;

// Easiest path forward is probably to just pass a buffer to a function here
// and implement the OREEncrypt trait for a JsBuffer

fn init(mut cx: FunctionContext) -> JsResult<BoxedCipher> {
    let k1: [u8; 16] = hex!("00010203 04050607 08090a0b 0c0d0e0f");
    let k2: [u8; 16] = hex!("00010203 04050607 08090a0b 0c0d0e0f");
    let seed = hex!("00010203 04050607");
    let cipher: OREAES128 = ORECipher::init(k1, k2, &seed).or_else(|e| cx.throw_error("Could not init cipher"))?;

    let ore = RefCell::new(Cipher(cipher));

    return Ok(cx.boxed(ore));
}

fn encrypt(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let cipher = cx.argument::<BoxedCipher>(0)?;
    let mut ore = &mut *cipher.borrow_mut();
    let input = cx.argument::<JsBuffer>(1)?;
    
    let x = cx.borrow(&input, |data| {
        let mut plaintext: PlainText<8> = Default::default();
        let slice = data.as_slice::<u8>();
        /*if slice.len() != 8 {
            return Err("Input too short");
        }*/
        /* TODO: ORE encrypt should just take a slice of u8 and we can avoid this clone. */
        plaintext.clone_from_slice(slice);
        // TODO: Should we encrypt _inside_ the borrow block or later? What about a promise?
        Ok(ore.0.encrypt(&plaintext)?.to_bytes())
    }).or_else(|err: OREError| {
        cx.throw_error("ORE error")
    })?;

    // Looking at the source code, this appears to do an unsafe memory reinterpret (so it is
    // probably fast)
    let ct = JsBuffer::external(&mut cx, x);
    return Ok(ct);
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encrypt", encrypt)?;
    cx.export_function("initCipher", init)?;
    Ok(())
}
