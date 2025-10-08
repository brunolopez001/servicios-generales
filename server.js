// server.js
// Simple Express API to receive leads and save to MongoDB using Mongoose
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({limit: '10mb'})); // allow base64 images

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser:true, useUnifiedTopology:true})
  .then(()=> console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Lead schema
const LeadSchema = new mongoose.Schema({
  name: {type:String},
  phone: {type:String, required:true},
  category: {type:String},
  urgency: {type:String},
  address: {type:String},
  budget: {type:String},
  description: {type:String},
  photos: {type:[String]}, // store base64 or URLs
  consent: {type:Boolean, default:false},
  status: {type:String, default:'new'},
  created_at: {type:Date, default:Date.now}
}, {timestamps:true});

const Lead = mongoose.model('Lead', LeadSchema);

// health check
app.get('/api/health', (req,res)=> res.json({ok:true, time: new Date().toISOString()}));

// POST /api/leads
app.post('/api/leads', async (req,res)=>{
  try{
    const {name, phone, category, urgency, address, budget, description, photos, consent} = req.body;
    if(!phone) return res.status(400).json({error:'phone_required'});

    const lead = new Lead({name, phone, category, urgency, address, budget, description, photos, consent});
    await lead.save();

    // TODO: trigger notifications to contractors (webhook, queue, or third-party)

    return res.status(201).json({ok:true, id: lead._id});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'server_error'});
  }
});

// simple listing endpoint for admin (paginate)
app.get('/api/leads', async (req,res)=>{
  const page = Math.max(1, parseInt(req.query.page||1));
  const limit = Math.min(100, parseInt(req.query.limit||20));
  const skip = (page-1)*limit;
  const docs = await Lead.find().sort({created_at:-1}).skip(skip).limit(limit);
  const total = await Lead.countDocuments();
  res.json({docs, total, page, limit});
});

app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
