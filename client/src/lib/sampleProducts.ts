export const sampleProducts = [
  {
    id: "PROD001",
    title: "Premium Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: "299.99",
    sku: "WH-1000XM4",
    brand: "AudioTech",
    category: "Electronics",
    stockLevel: "150",
    weight: "0.25",
    dimensions: "7.3 x 3.0 x 9.4",
    manufacturerCode: "AT-WH-1000",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-19"
  },
  {
    id: "PROD002",
    title: "Organic Cotton T-Shirt",
    description: "100% organic cotton, sustainably sourced",
    price: "29.99",
    sku: "OCT-BLK-M",
    brand: "EcoWear",
    category: "Apparel",
    stockLevel: "500",
    weight: "0.2",
    dimensions: "25 x 15 x 2",
    manufacturerCode: "EW-OCT-001",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-18"
  },
  {
    id: "PROD003",
    title: "",  // Empty title to test validation
    description: "Professional-grade DSLR camera with 24MP sensor",
    price: "1299.99",
    sku: "CAM-PRO-24",
    brand: "PhotoPro",
    category: "Photography",
    stockLevel: "75",
    weight: "0.89",
    dimensions: "15.6 x 10.2 x 7.8",
    manufacturerCode: "PP-DSLR-24",
    createdAt: "2024-01-05",
    updatedAt: "2024-01-17"
  },
  {
    id: "PROD004",
    title: "Smart Home Hub 2nd Gen",
    description: "Control your entire smart home with voice commands",
    price: "invalid_price",  // Invalid price to test validation
    sku: "SHH-2G",
    brand: "SmartLife",
    category: "Smart Home",
    stockLevel: "200",
    weight: "0.35",
    dimensions: "11.0 x 11.0 x 3.5",
    manufacturerCode: "SL-HUB-2G",
    createdAt: "2024/01/20",  // Different date format
    updatedAt: "2024-01-20"
  },
  {
    id: "PROD005",
    title: "Pr",  // Short title to test minimum length
    description: "Professional grade running shoes with advanced cushioning",
    price: "159.99",
    sku: "RUN-PRO-X",
    brand: "SportFlex",
    category: "Footwear",
    stockLevel: "1500",
    weight: "0.6",
    dimensions: "12.0 x 8.0 x 4.5",
    manufacturerCode: "SF-RUN-PRO",
    createdAt: "2024-01-12",
    updatedAt: "2024-01-16"
  }
];
