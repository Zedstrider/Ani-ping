const express=require('express') //include external modules
const app=express()
app.use(express.static(__dirname))
app.use(express.urlencoded({ extended: true }))
const { google } = require('googleapis')
const axios=require('axios')
require('dotenv').config()
const mongoose = require('mongoose'); // Import the driver

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  joinedAt: { type: Date, default: Date.now }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

const PORT = 5501
// Setup Google Auth Client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

let lastSentAnime=null

async function sendEmail(to, subject, message) {
  try {
    const rawMessage = makeBody(
      to,                          //  Now Dynamic!
      process.env.GMAIL_USER,      // From (Still you)
      subject,
      message
    );

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send to " + to, error.message);
  }
}

// Helper to format email for Google
function makeBody(to, from, subject, message) {
  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    message
  ].join('\n')

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function checkUpdates() {
  // Temporary: Comment this out to test immediately, 
  // uncomment it when you deploy!
  /* const today = new Date().getDay();
  if (today !== 0) {
      console.log("Not Sunday. Skipping check.");
      return; 
  }
  */

  try {
    console.log("Checking Jikan API...");
    const response = await axios.get('https://api.jikan.moe/v4/schedules/sunday');
    const animeList = response.data.data;

    const targetAnime = animeList.find((anime) => {
      return anime.title === 'One Piece';
    });

    // Note: We removed the 'lastSentAnime' check for testing so it sends every time we restart.
    // In production, you'd want that check back!
    if (targetAnime) {
      
      // 1. Fetch all subscribers from MongoDB
      const allSubscribers = await Subscriber.find({});
      console.log(`Found ${allSubscribers.length} subscriber(s). Sending emails...`);

      // 2. Loop through each subscriber
      for (const sub of allSubscribers) {
          await sendEmail(
            sub.email, 
            `New episode alert: ${targetAnime.title}`,
            `<h3>Heads up!</h3><p><b>${targetAnime.title}</b> is currently airing.</p>`
          );
      }
      
    } else {
      console.log("One Piece not found in schedule.");
    }
  } catch (error) {
    console.error("Logic Error:", error.message);
  }
}

app.post('/subscribe', async (req, res) => {
  const email = req.body.email;

  try {
    //Create a new document using our Model
    const newSubscriber = new Subscriber({ email: email });

    //Save it to the database (this is an async operation!)
    await newSubscriber.save();

    console.log("New Subscriber added:", email);
    
    res.send(`
      <h1>Success!</h1>
      <p><b>${email}</b> is now subscribed to One Piece alerts.</p>
      <a href="/">Go Back</a>
    `);

  } catch (error) {
    console.error("Error adding subscriber:", error.message);
    if (error.code === 11000) {
        res.send(`<h1>Oops!</h1><p>That email is already subscribed.</p><a href="/">Go Back</a>`);
    } else {
        res.send(`<h1>Error</h1><p>Something went wrong. Please try again.</p>`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  
  // Run immediately on startup
  checkUpdates()

  // Then run every hour
  setInterval(checkUpdates, 3600000)
});

app.get('/', (req, res) => {
  res.send(`<p>Ani-Ping is online!</p>`)
});