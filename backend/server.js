import express from 'express'
import session from 'express-session'
import User from './model/user.js'
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname,join } from 'path';
const __filename = fileURLToPath(import.meta.url);
import Story from './model/story.js'
import dotenv from 'dotenv';
dotenv.config();
const address=join(dirname(__filename),"..")
const app=express()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/address",express.static(address))
const MONGO_URI=process.env.MONGO_URI
const PORT=process.env.PORT;
const API_KEY=process.env.API_KEY;
//Session
app.use(session({
    secret: "vaishnavi-arpit",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))
//database connect
mongoose.connect(MONGO_URI)
.then(()=> console.log("DataBase Connected ✅")).catch((err)=>console.log(err));

//home 
app.get("/",(req,res)=>{
    res.sendFile(address+"/frontend/homepage.html")
})
// explore
app.get("/explore",(req,res)=>{
    if (!req.session.userId) {
        return res.redirect('/');
      }
    res.sendFile(address+"/frontend/explore.html")
})
// aboutus
app.get("/aboutus",(req,res)=>{
    res.sendFile(address+"/frontend/aboutus.html")
})
// login 
app.post("/login",async (req,res)=>{
    const{username,password}=req.body;
    try{
        const user =await User.findOne({username});
        if(!user) return res.status(400).json({ message: "Invalid username" });
        if (user.password !== password) {
            return res.status(400).json({ message: "Invalid password" });
          }
        req.session.userId= user._id;
        res.status(200).json({ message: "Login successful" });;
    } catch(err){
        res.status(500).json({ message: "Server error" });
    }
});

// logout 
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  //signup
  app.post('/signup', async (req, res) => {
    const { fullName, username, password } = req.body;
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser){
          return res.status(400).json({ message: "Username already taken!" });
      }
      const newUser = new User({ fullName, username, password});
      await newUser.save();
      req.session.userId = newUser._id;

      res.status(201).json({ message: "Signup successful!" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
  // session check
  app.get('/check-session', (req, res) => {
    if (req.session.userId) {
      res.json({ loggedIn: true });
    } else {
      res.json({ loggedIn: false });
    }
  });
  

// suggesetion
app.get("/suggestion",(req,res)=>{
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(address+"/frontend/suggestion.html")
})
// notification
app.get("/notification",(req,res)=>{
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(address+"/frontend/notification.html")
})
// create
app.get("/create",(req,res)=>{
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(address+"/frontend/create.html")
})
// profile
app.get("/profile",(req,res)=>{
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(address+"/frontend/profile.html")
})
// function to count read and listen time
function calculateTime(paragraph) {
  const readingSpeed = 150;
  const listeningSpeed = 100;

  const words = paragraph.trim().split(/\s+/).length;
  const readTime = words / readingSpeed;     
  const listenTime = words / listeningSpeed; 
  return {
    readTime: readTime.toFixed(2),
    listenTime: listenTime.toFixed(2),
  };
}
// create route
app.post('/create', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/');
    }

    const { title, authorName, content, genres } = req.body;

    if (!title || !authorName || !content) {
      return res.status(400).json({ message: 'Title, author, and content are required.' });
    }
    const {readTime,listenTime}=calculateTime(content);
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const newStory = new Story({
      userId: req.session.userId,
      title,
      authorName:user.username,
      genres: genres || [],
      content,
      readTime,
      listenTime
    });

    await newStory.save();

    return res.status(201).json({ message: 'Story created successfully!' });
  } catch (err) {
    console.error('Story creation error:', err);
    return res.status(500).json({ message: 'Server error while creating story.' });
  }
});

//profile data
app.get('/profile/data', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/');
    }

    const user = await User.findById(req.session.userId).select('fullName username bio location');
    const stories = await Story.find({ userId: req.session.userId }).sort({ createdAt: -1 });

    res.json({ user, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// update profile data
app.put("/profile/update", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Please login first." });
    }

    const { fullName, username, bio, location } = req.body;

    const existingUser = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.session.userId } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken. Please choose another." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.userId,
      { fullName, username: username.toLowerCase(), bio, location },
      { new: true, runValidators: true }
    ).select("fullName username bio location");

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});
// delete story
app.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete user by ID
    const deletedStory = await Story.findByIdAndDelete(id);

    if (!deletedStory) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', deletedStory });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// stories data
app.get("/stories",async (req,res)=>{
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please login first." });
  }
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stories', error });
  }
});
// read data
app.get('/read/data/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
});
// read
app.get("/read/:id",(req,res)=>{
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please login first." });
  }
  res.sendFile(address+"/frontend/read.html");
});

// listen
app.get("/listen/:id",(req,res)=>{
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please login first." });
  }
  res.sendFile(address+"/frontend/listen.html");
});
// audio convert
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-preview-tts"; 

app.post("/api/generate-tts", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login." });
  }

  const { storyContent } = req.body;
  if (!storyContent) {
    return res.status(400).json({ message: "Missing story content." });
  }

  try {
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: storyContent }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore" 
            }
          }
        }
      }
    };

    // We use the v1beta endpoint for the TTS preview model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({
        message: "Gemini API Error",
        details: data.error?.message || "Unknown error"
      });
    }

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      return res.status(400).json({ message: "Content blocked by safety filters." });
    }

    const audioPart = candidate?.content?.parts?.find(
      p => p.inlineData && p.inlineData.mimeType.startsWith("audio/")
    );

    if (!audioPart) {
      return res.status(500).json({ message: "No audio data returned." });
    }

    // Send the base64 and mimeType (which contains the sample rate)
    res.json({
      audioData: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType
    });

  } catch (err) {
    console.error("Server Crash:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});
app.listen(PORT,()=>{
  console.log(`http://localhost:${PORT}`);
})
