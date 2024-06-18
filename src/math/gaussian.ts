export function createGaussian(sigma: number) {
  const sigma2 = sigma * sigma;
  const K = 1 / Math.sqrt(2 * Math.PI * sigma * sigma);
  return (x: number) => K * Math.exp(-(x * x) / (2 * sigma2));
}
