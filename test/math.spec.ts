import { expect, test } from 'vitest'
import { createGaussian } from '../src/math/gaussian'

test('Gaussian ', () => {
    const gaussian = createGaussian(1);
    expect(gaussian(0)).toBe(0.3989422804014327)
    expect(gaussian(1)).toBe(gaussian(-1))
    expect(gaussian(2)).toBe(gaussian(-2))
    expect(gaussian(2)).toBe(gaussian(-2))
})

test('Gaussian area', () => {
    const gaussian = createGaussian(1);
    const dx = 0.01

    let sum = 0
    for (let x = -100; x <= 100; x += dx) {
        sum += gaussian(x) * dx
    }

    expect(sum).toBeCloseTo(1.0, 8)
});

test('Gaussian stress by sigma parameter', () => {
    for (let sigma = 1; sigma < 20; ++sigma) {

        const gaussian = createGaussian(sigma);
        const dx = 0.01

        let sum = 0
        for (let x = -100; x <= 100; x += dx) {
            sum += gaussian(x) * dx
        }

        expect(sum).toBeCloseTo(1.0, 6)
    }
})
