require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Helper to sanitize coordinates if needed
const sanitizeCoordinates = (coords) => undefined;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to DB.");

    // User Schema Minimal
    const userSchema = new mongoose.Schema({
        name: String,
        email: String,
        passwordHash: String,
        role: String,
        roles: [String],
        status: String,
        profile: mongoose.Schema.Types.Mixed
    }, { strict: false });

    const User = mongoose.model('User', userSchema, 'users');

    const email = 'vaishnavikonchada2004@gmail.com';
    const password = 'Vaishu@28';
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });

    if (user) {
        console.log("User found! Updating to admin role and updating password...");
        user.role = 'admin';
        if (!user.roles.includes('admin')) {
            user.roles.push('admin');
        }
        user.passwordHash = passwordHash;
        await user.save();
        console.log("User updated to admin successfully. You can now login.");
    } else {
        console.log("User not found! Creating new admin user...");
        user = new User({
            name: 'Vaishnavi Konchada',
            email: email,
            passwordHash: passwordHash,
            role: 'admin',
            roles: ['admin'],
            status: 'active',
            profile: {
                phone: '+918888521472',
                country: 'India',
                state: 'Andhra Pradesh',
                district: 'Srikakulam',
                mandal: 'Palasa',
                doorNo: '',
                pincode: '532222',
                locationText: 'Palasa'
            }
        });
        await user.save();
        console.log("Admin user created successfully. You can now login.");
    }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
