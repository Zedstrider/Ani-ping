const axios=require('axios')

async function checkEpisodes(){
    try{
        const response = await axios.get('https://api.jikan.moe/v4/schedules')

        //list of anime objects
        const animeList = response.data.data;

        //list containing only the titles
        const titles = animeList.map((anime)=>{
        return anime.title
    })
        console.log(titles)
    }catch(error){
        console.error("Something went wrong:",error)
    }
}



checkEpisodes()

