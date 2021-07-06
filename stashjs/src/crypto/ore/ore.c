#define NAPI_VERSION 6
#include <node_api.h>
#include <js_native_api.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include "fastore/crypto.h"
#include "fastore/ore_blk.h"
#include "fastore/aes.h"
#include "fastore/errors.h"

// TODO: Use static const int
#define PLAINTEXT_SIZE 64
#define BLOCK_SIZE 8
#define KEY_SIZE 16

static char ERR_INVALID_KEY = 0x02;
static char ERR_ORE_INIT = 0x03;

// TODO: Move these to ore_blk.h
#define CEIL(x, y) (((x) + (y) - 1) / (y))

static inline int _ore_blk_ciphertext_len_left(ore_blk_params params) {
  uint32_t nblocks = CEIL(params->nbits, params->block_len);

  return (AES_BLOCK_LEN + CEIL(params->nbits, 8)) * nblocks;
}

static inline int _ore_blk_ciphertext_len_right(ore_blk_params params) {
  uint32_t block_len = params->block_len;
  uint32_t nslots = 1 << block_len;
  uint32_t nblocks = CEIL(params->nbits, block_len);

  return AES_BLOCK_LEN + CEIL(nslots, 8) * nblocks;
}

#define CTL_LEN(params) (_ore_blk_ciphertext_len_left(params))
#define CTR_LEN(params) (_ore_blk_ciphertext_len_right(params))

/* Used to call additional code if the NAPI status is not OK */
#define NAPI_ASSERT_WITH(x) if((status = (x)) != napi_ok)

/* Shortcut to simply return the NAPI status is not OK */
#define NAPI_ASSERT(x) { NAPI_ASSERT_WITH(x) { return status; } };

/* Shortcut to check for a valid napi arg */
#define NAPI_ASSERT_ARG(x) if (!(x)) { return napi_invalid_arg; }

#define THROW(code, message) {\
  napi_throw_error(env, &code, message); \
  return NULL;\
}

#define THROW_TYPE(code, message) {\
  napi_throw_type_error(env, &code, message); \
  return NULL;\
}

napi_status internal_napi_get_key(napi_env env, napi_value arg, void **key) {
  bool isBuffer;
  napi_status status;
  size_t length = 0;

  NAPI_ASSERT(napi_is_buffer(env, arg, &isBuffer));
  NAPI_ASSERT_ARG(isBuffer);
  NAPI_ASSERT(napi_get_buffer_info(env, arg, key, &length));
  NAPI_ASSERT_ARG(length == KEY_SIZE);

  return napi_ok;
}

napi_value ore_encrypt(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 3;

  uint64_t plaintext = 0;
  bool lossless = true;

  napi_value argv[3];
  napi_value ret;

  ore_blk_params params;
  ore_blk_secret_key sk;

  /* Cipher texts */
  ore_blk_ciphertext cipher_text;
  napi_value ret_left;
  napi_value ret_right;
  void *ctl_buffer = NULL;
  void *ctr_buffer = NULL;

  /* Keys */
  void *prf_key = NULL;
  void *prp_key = NULL;

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  if (status != napi_ok || argc != 3) {
    napi_throw_error(env, NULL, "Failed to parse arguments");
  }

  NAPI_ASSERT_WITH(napi_get_value_bigint_uint64(env, argv[0], &plaintext, &lossless)) {
    napi_throw_type_error(env, NULL, "Invalid plaintext (must be uint64)");
    return NULL;
  }

  if (!lossless) {
    napi_throw_type_error(env, NULL, "Plaintext value too large (must be uint64)");
    return NULL;
  }

  NAPI_ASSERT_WITH(internal_napi_get_key(env, argv[1], &prf_key)) {
    THROW_TYPE(ERR_INVALID_KEY, "Invalid PRF Key");
  }

  NAPI_ASSERT_WITH(internal_napi_get_key(env, argv[2], &prp_key)) {
    THROW_TYPE(ERR_INVALID_KEY, "Invalid PRP Key");
  }

  if (init_ore_blk_params(params, PLAINTEXT_SIZE, BLOCK_SIZE) != ERROR_NONE) {
    THROW(ERR_ORE_INIT, "ORE Block initialisation failed");
  }

  if (setup_aes_key(&sk->prf_key, (byte *)prf_key, KEY_SIZE) != ERROR_NONE) {
    ore_blk_cleanup(sk);
    napi_throw_error(env, NULL, "ORE Block key setup failed (prf_key)");
    return NULL;
  }

  if (setup_aes_key(&sk->prp_key, (byte *)prp_key, KEY_SIZE) != ERROR_NONE) {
    ore_blk_cleanup(sk);
    napi_throw_error(env, NULL, "ORE Block key setup failed (prp_key)");
    return NULL;
  }

  memcpy(sk->params, params, sizeof(ore_blk_params));
  sk->initialized = true;

  if (init_ore_blk_ciphertext(cipher_text, params) != ERROR_NONE) {
    ore_blk_cleanup(sk);
    napi_throw_error(env, NULL, "ORE Block CT init failed");
    return NULL;
  }

  if (ore_blk_encrypt_ui(cipher_text, sk, plaintext) != ERROR_NONE) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "ORE Block encrypt failed");
    return NULL;
  }

  NAPI_ASSERT_WITH(napi_create_buffer(env, CTL_LEN(params), &ctl_buffer, &ret_left)) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "ORE Block CT init failed");
    return NULL;
  }

  NAPI_ASSERT_WITH(napi_create_buffer(env, CTR_LEN(params), &ctr_buffer, &ret_right)) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "ORE Block CT init failed");
    return NULL;
  }

  memcpy(ctl_buffer, cipher_text->comp_left, CTL_LEN(params));
  memcpy(ctr_buffer, cipher_text->comp_right, CTR_LEN(params));

  NAPI_ASSERT_WITH(napi_create_object(env, &ret)) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "Failed to encrypt");
    return NULL;
  }

  if (napi_set_named_property(env, ret, "leftCipherText", ret_left) != napi_ok) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "ORE Block CT init failed");
    return NULL;
  }

  if (napi_set_named_property(env, ret, "rightCipherText", ret_right) != napi_ok) {
    ore_blk_cleanup(sk);
    clear_ore_blk_ciphertext(cipher_text);
    napi_throw_error(env, NULL, "ORE Block CT init failed");
    return NULL;
  }

  clear_ore_blk_ciphertext(cipher_text);
  ore_blk_cleanup(sk);

  return ret;
}

/*
  This following function implement an order-preserving translation of 64 bit
  floats to 64 bit doubles (and the reverse operation - although that is just
  used for verifying correctness).

  The 64 bit integer that is produced is a plaintext that will be ORE encrypted
  later on.
  
  The mapping is such that the ordering of the floats will be preserved when
  mapped to an unsigned integer, for example, an array of unsigned integers
  dervived from a sorted array of doubles will result in no change to its
  ordering when it itself is sorted.

  The mapping does not preserve any notion of the previous value after the
  conversion - only ordering is preserved.
  
  Caveat: NaN and -ve & +ve infinity will also be mapped and ordering is not
  well-defined with those values. Those values should be discarded before
  converting arrays of those values.

  This post was used as a reference for building this implementation:
  https://lemire.me/blog/2020/12/14/converting-floating-point-numbers-to-integers-while-preserving-order
*/

int64_t unsigned_to_signed(uint64_t x) {
  int64_t  a;
  memcpy(&a, &x, sizeof(x));
  return a;
}

uint64_t sign_flip(uint64_t in) {
  uint64_t mask = -unsigned_to_signed(in >> 63) | 0x8000000000000000;
  return in ^ mask;
}

uint64_t inverse_sign_flip(uint64_t in) {
  uint64_t mask = ((in >> 63) - 1) | 0x8000000000000000;
  return in ^ mask;
}

static double uint64_to_double(uint64_t x) {
  double a;
  memcpy(&a, &x, sizeof(x));
  return a;
}

static uint64_t double_to_uint64(double x) {
  uint64_t a;
  memcpy(&a, &x, sizeof(x));
  return a;
}


napi_value encode_double(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  napi_value argv[1];

  double plaintext;
  napi_value encoded;

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (status != napi_ok || argc != 1) {
    napi_throw_error(env, NULL, "Failed to parse arguments");
  }

  NAPI_ASSERT_WITH(napi_get_value_double(env, argv[0], &plaintext)) {
    napi_throw_type_error(env, NULL, "Invalid plaintext (must be number)");
    return NULL;
  }

  NAPI_ASSERT_WITH(napi_create_bigint_uint64(env, sign_flip(double_to_uint64(plaintext)), &encoded)) {
    napi_throw_error(env, NULL, "Failed to create bigint");
    return NULL;
  }

  return encoded;
}

napi_value decode_bigint(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  napi_value argv[1];

  bool lossless = true;
  uint64_t plaintext;
  napi_value decoded;

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (status != napi_ok || argc != 1) {
    napi_throw_error(env, NULL, "Failed to parse arguments");
  }

  NAPI_ASSERT_WITH(napi_get_value_bigint_uint64(env, argv[0], &plaintext, &lossless)) {
    napi_throw_type_error(env, NULL, "Invalid plaintext (must be bigint in uint64_t range)");
    return NULL;
  }

  if (!lossless) {
    napi_throw_type_error(env, NULL, "Invalid plaintext (must be bigint in uint64_t range)");
    return NULL;
  }

  NAPI_ASSERT_WITH(napi_create_double(env, uint64_to_double(inverse_sign_flip(plaintext)), &decoded)) {
    napi_throw_error(env, NULL, "Failed to create bigint");
    return NULL;
  }

  return decoded;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value ore_encrypt_fn;
  napi_value encode_double_fn;
  napi_value decode_bigint_fn;

  // See https://nodejs.org/api/n-api.html#n_api_napi_create_function
  status = napi_create_function(env, NULL, 0, ore_encrypt, NULL, &ore_encrypt_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to wrap native function");
  }

  status = napi_set_named_property(env, exports, "oreEncryptTerm", ore_encrypt_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  status = napi_create_function(env, NULL, 0, encode_double, NULL, &encode_double_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to wrap native function");
  }

  status = napi_set_named_property(env, exports, "encodeNumber", encode_double_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  status = napi_create_function(env, NULL, 0, decode_bigint, NULL, &decode_bigint_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to wrap native function");
  }

  status = napi_set_named_property(env, exports, "decodeBigint", decode_bigint_fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init);
