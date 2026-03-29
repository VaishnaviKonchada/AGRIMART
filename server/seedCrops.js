import mongoose from 'mongoose';
import Crop from './src/models/Crop.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const sampleCrops = [
  {
    farmerId: null,
    cropName: "Tomato",
    availableQuantity: 500,
    quantity: 500,
    pricePerKg: 30,
    location: "Rajahmundry, AP",
    description: "Fresh organic tomatoes",
    images: ["https://cdn.pixabay.com/photo/2017/10/06/17/17/tomato-2823826_1280.jpg"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Potato",
    availableQuantity: 1000,
    quantity: 1000,
    pricePerKg: 25,
    location: "Vizag, AP",
    description: "Quality potatoes",
    images: ["https://cdn.pixabay.com/photo/2016/08/11/08/43/potatoes-1585060_1280.jpg"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Apple",
    availableQuantity: 200,
    quantity: 200,
    pricePerKg: 120,
    location: "Hyderabad, TS",
    description: "Fresh apples",
    images: ["https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&h=400&fit=crop"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Banana",
    availableQuantity: 300,
    quantity: 300,
    pricePerKg: 50,
    location: "Vijayawada, AP",
    description: "Ripe bananas",
    images: ["https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600&h=400&fit=crop"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Carrot",
    availableQuantity: 400,
    quantity: 400,
    pricePerKg: 35,
    location: "Guntur, AP",
    description: "Fresh carrots",
    images: ["https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&h=400&fit=crop"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Onion",
    availableQuantity: 800,
    quantity: 800,
    pricePerKg: 40,
    location: "Warangal, TS",
    description: "Quality onions",
    images: ["https://images.unsplash.com/photo-1587049352846-4a222e784129?w=600&h=400&fit=crop"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Brinjal",
    availableQuantity: 250,
    quantity: 250,
    pricePerKg: 45,
    location: "Karimnagar, TS",
    description: "Fresh brinjals",
    images: ["https://images.unsplash.com/photo-1602096903207-c27a09a2378e?w=600&h=400&fit=crop"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Mango",
    availableQuantity: 350,
    quantity: 350,
    pricePerKg: 100,
    location: "Nellore, AP",
    description: "Sweet mangoes",
    images: ["https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&h=400&fit=crop"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Guava",
    availableQuantity: 280,
    pricePerKg: 50,
    location: "Kurnool, AP",
    description: "Fresh guavas",
    images: ["/crops/guava.jpg"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Pomegranate",
    availableQuantity: 200,
    pricePerKg: 110,
    location: "Nellore, AP",
    description: "Fresh pomegranates",
    images: ["/crops/pomegranate.jpg"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Lemon",
    availableQuantity: 400,
    pricePerKg: 60,
    location: "Hyderabad, TS",
    description: "Fresh lemons",
    images: ["/crops/lemon.jpg"],
    category: "Fruit",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Green Chilli",
    availableQuantity: 250,
    quantity: 250,
    pricePerKg: 90,
    location: "Guntur, AP",
    description: "Fresh green chillies",
    images: ["https://cdn.pixabay.com/photo/2018/04/09/05/46/chilli-3302972_1280.jpg"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Garlic",
    availableQuantity: 300,
    quantity: 300,
    pricePerKg: 78,
    location: "Warangal, TS",
    description: "Fresh garlic",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Mint",
    availableQuantity: 100,
    quantity: 100,
    pricePerKg: 25,
    location: "Bangalore, KA",
    description: "Fresh mint leaves",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Coriander",
    availableQuantity: 120,
    quantity: 120,
    pricePerKg: 20,
    location: "Hyderabad, TS",
    description: "Fresh coriander",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Okra",
    availableQuantity: 180,
    quantity: 180,
    pricePerKg: 38,
    location: "Tandur, AP",
    description: "Fresh okra",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Beetroot",
    availableQuantity: 220,
    quantity: 220,
    pricePerKg: 42,
    location: "Sangareddy, TS",
    description: "Fresh beetroots",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Radish",
    availableQuantity: 200,
    quantity: 200,
    pricePerKg: 26,
    location: "Sangareddy, TS",
    description: "Fresh radishes",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Beans",
    availableQuantity: 150,
    quantity: 150,
    pricePerKg: 54,
    location: "Mancherial, TS",
    description: "Fresh beans",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Peas",
    availableQuantity: 180,
    quantity: 180,
    pricePerKg: 58,
    location: "Mancherial, TS",
    description: "Fresh peas",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Cabbage",
    availableQuantity: 300,
    quantity: 300,
    pricePerKg: 28,
    location: "Mancherial, TS",
    description: "Fresh cabbage",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
  {
    farmerId: null,
    cropName: "Cauliflower",
    availableQuantity: 250,
    quantity: 250,
    pricePerKg: 38,
    location: "Mancherial, TS",
    description: "Fresh cauliflower",
    images: ["https://images.unsplash.com/photo-1599599810694-b5ac4dd64406?w=400"],
    category: "Vegetable",
    status: "listed",
    isActive: true,
  },
];

async function seedCrops() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrimart');
    console.log('✅ Connected to MongoDB\n');

    // Get a farmer user to assign crops to
    let farmer = await User.findOne({ role: 'farmer' });
    
    if (!farmer) {
      console.log('⚠️ No farmer found, creating demo farmer...');
      const passwordHash = await bcrypt.hash('farmer123', 10);
      farmer = await User.create({
        name: 'Demo Farmer',
        email: 'farmer@demo.com',
        passwordHash,
        role: 'farmer',
      });
      console.log('✅ Demo farmer created\n');
    }

    // Assign farmer ID to all crops
    const cropsWithFarmer = sampleCrops.map(crop => ({
      ...crop,
      farmerId: farmer._id,
    }));

    // Clear existing crops (optional)
    const existingCount = await Crop.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing crops. Clearing...`);
      await Crop.deleteMany({});
    }

    // Insert new crops
    console.log('Seeding crops...');
    const result = await Crop.insertMany(cropsWithFarmer);
    
    console.log(`\n✅ Successfully seeded ${result.length} crops!`);
    console.log('\nSample crops:');
    result.slice(0, 3).forEach((crop, i) => {
      console.log(`${i + 1}. ${crop.cropName} - ₹${crop.pricePerKg}/kg (${crop.location})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error seeding crops:', e.message);
    process.exit(1);
  }
}

seedCrops();
