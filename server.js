const express=require('express') 
const app=express()
app.use(express.static(__dirname))
app.use(express.urlencoded({ extended: true }))
const { google } = require('googleapis')
const axios=require('axios')
require('dotenv').config()
const mongoose = require('mongoose'); 
const cron = require('node-cron')


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Connection Error:", err))

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  joinedAt: { type: Date, default: Date.now },
  animeTitle:{ type: [String], required: true }
})

const Subscriber = mongoose.model('Subscriber', subscriberSchema)

const PORT = 5501
// Setup Google Auth Client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

async function sendEmail(to, subject, message) {
  try {
    const rawMessage = makeBody(
      to,                          
      process.env.GMAIL_USER,      
      subject,
      message
    );

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send to " + to, error.message)
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
  try {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const today = new Date()
    const dayName = days[today.getDay()]
    console.log("Checking Jikan API...")
    const response = await axios.get(`https://api.jikan.moe/v4/schedules/${dayName}`)
    const animeList = response.data.data

    console.log(`Found ${animeList.length} anime airing today.`)
    
    for (const anime of animeList) {
      console.log("Airing today:", anime.title)
    }
    for (const anime of animeList) {
      // Find subscribers who are watching THIS specific anime
      const subscribers = await Subscriber.find({ animeTitle: anime.title })

      if (subscribers.length > 0) {
        console.log(`Found ${subscribers.length} fans for: ${anime.title}`)

        //Send emails to those fans
        for (const sub of subscribers) {
          await sendEmail(
            sub.email,
            `New episode alert: ${anime.title}`,
            `<h3>Heads up!</h3><p><b>${anime.title}</b> is currently airing.</p>`
          )
        }
      }
    }
  } catch (error) {
    console.error("Logic Error:", error.message)
  }
}

app.post('/subscribe', async (req, res) => {
  const email = req.body.email
  const animeTitle = req.body.animeTitle
  const existingSubscriber = await Subscriber.findOne({ email: email });
  try {
    if (existingSubscriber) {
        if (!existingSubscriber.animeTitle.includes(animeTitle)){
          existingSubscriber.animeTitle.push(animeTitle)
          await existingSubscriber.save()
        }else{
          return res.send(`
                          <h1>Oops!</h1>
                          <p>You have already subscribed to <b>${animeTitle}</b>.</p>
                          <a href="/">Go Back</a>
        `)
        }
  } else {
        //Create a new document using the Model
        const newSubscriber = new Subscriber({ email: email , animeTitle:animeTitle})

        //Save it to the database (this is an async operation!)
        await newSubscriber.save()

        console.log("New Subscriber added:", email)
    }
    res.send(`
      <h1>Success!</h1>
      <p><b>${email}</b> is now subscribed to ${animeTitle} alerts.</p>
      <a href="/">Go Back</a>
    `)

  } catch (error) {
    console.error("Error adding subscriber:", error.message)
    if (error.code === 11000) {
        res.send(`<h1>Oops!</h1><p>That email is already subscribed.</p><a href="/">Go Back</a>`)
    } else {
        res.send(`<h1>Error</h1><p>Something went wrong. Please try again.</p>`)
    }
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  
  
  cron.schedule('0 8 * * *', () => {
    checkUpdates()
  })
})

app.get('/', (req, res) => {
  res.send(`<p>Ani-Ping is online!</p>`)
})

app.get('/test-check', (req, res) => { 
  checkUpdates();
  res.send(`<p>Manual Check started</p>`)
})