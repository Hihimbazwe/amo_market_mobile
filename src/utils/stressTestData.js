export const generateFakeProducts = (count = 1000) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `fake-product-${i}`,
    title: `Product ${i + 1}`,
    price: Math.floor(Math.random() * 100000) + 1000,
    description: `This is a fake product description for product ${i + 1}`,
    image: `https://picsum.photos/seed/${i}/300/300`,
    category: ['Electronics', 'Fashion', 'Home & Living', 'Sports'][i % 4],
    rating: (Math.random() * 5).toFixed(1),
    seller: `Seller ${i % 20}`,
  }));
};