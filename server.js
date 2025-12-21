const express=require('express') //include external modules
const app=express()
const nodemailer = require('nodemailer')
const axios=require('axios')
require('dotenv').config()

const PORT = 5501

let lastSentAnime

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
})

async function checkUpdates(){
    // 1. Day Check: Stop immediately if today is not Sunday
    // (0 = Sunday, 1 = Monday, etc.)
    const today = new Date().getDay();
    if (today !== 0) {
        console.log("Not Sunday. Skipping check.");
        return; 
    }
    try{
        const response = await axios.get('https://api.jikan.moe/v4/schedules/sunday')
         //list of anime objects
        const animeList = response.data.data;

        const targetAnime=animeList.find((anime)=>{
            return anime.title==='One Piece'
        })
        
        //Debug Logs
        console.log("--------------------------------");
        console.log("Check run at:", new Date().toLocaleTimeString());
        console.log("Did we find the show?", targetAnime ? "YES" : "NO");
        if (targetAnime) console.log("Memory says:", lastSentAnime);
        //-----------------------------------
        if(targetAnime&&lastSentAnime!=targetAnime.title){
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: process.env.GMAIL_USER, 
                subject: `New episode alert:${targetAnime.title}`,
                text: `Heads up! ${targetAnime.title} is currently airing.`
            }
        
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log('Error:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                    lastSentAnime=targetAnime.title
                }
            })
        }
    }catch(error){
        console.error("Something went wrong:",error)
    }
}

checkUpdates()
setInterval(checkUpdates,3600000)

app.listen(PORT,()=>{console.log(`Server is running on port ${PORT}`)})

app.get('/',(req,res)=>{
    res.send(`<p>Ani-Ping is online!</p>`)
})