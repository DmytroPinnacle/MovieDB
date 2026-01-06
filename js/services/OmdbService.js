
export class OmdbService {
  constructor(apikey = 'INSERT_YOUR_OMDB_API_KEY') {
    this.apikey = apikey;
    this.baseUrl = 'https://www.omdbapi.com/';
  }

  async getMovieByImdbId(imdbId) {
    if (!imdbId) return null;
    
    // Basic format check
    if (!/^tt\d{7,8}$/.test(imdbId)) {
        console.warn('Invalid IMDB ID format');
        return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}?i=${imdbId}&apikey=${this.apikey}`);
      const data = await response.json();
      
      if (data.Response === 'True') {
        return {
          title: data.Title,
          year: parseInt(data.Year, 10) || null,
          rated: data.Rated,
          released: data.Released,
          runtime: data.Runtime,
          genre: data.Genre,
          director: data.Director,
          writer: data.Writer,
          actors: data.Actors,
          plot: data.Plot,
          language: data.Language,
          country: data.Country,
          awards: data.Awards,
          poster: data.Poster,
          ratings: data.Ratings,
          metascore: data.Metascore,
          imdbRating: parseFloat(data.imdbRating) || null,
          imdbVotes: data.imdbVotes,
          imdbID: data.imdbID,
          type: data.Type,
          dvd: data.DVD,
          boxOffice: data.BoxOffice,
          production: data.Production,
          website: data.Website
        };
      } else {
        console.error('OMDb API Error:', data.Error);
        return null;
      }
    } catch (error) {
      console.error('Network Error:', error);
      return null;
    }
  }
}
