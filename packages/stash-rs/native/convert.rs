use core::mem;

pub(crate) trait ToOrderedInteger<T> {
    fn map_to(&self) -> T;
}

trait FromOrderedInteger<T> {
    fn map_from(input: T) -> Self;
}

impl ToOrderedInteger<u64> for f64 {
    fn map_to(&self) -> u64 {
        let num: u64 = self.to_bits();
        let signed: i64 = -(unsafe { mem::transmute(num >> 63) });
        let mut mask: u64 = unsafe { mem::transmute(signed) };
        mask |= 0x8000000000000000;
        return num ^ mask;
    }
}

impl FromOrderedInteger<u64> for f64 {
    fn map_from(input: u64) -> f64 {
        let i = (((input >> 63) as i64) - 1) as u64;
        let mask: u64 = i | 0x8000000000000000;
        return f64::from_bits(input ^ mask);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use quickcheck::TestResult;

    quickcheck! {
        fn roundtrip(x: f64) -> TestResult {
            if !x.is_nan() && x.is_finite() {
                return TestResult::from_bool(x == f64::map_from(x.map_to()));
            } else {
                return TestResult::discard();
            }
        }
    }
}
