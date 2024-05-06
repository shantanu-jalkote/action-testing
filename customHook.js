const { useEffect } = require("react");
const { useDispatch, useSelector } = require("react-redux");
const { apiOptions, movieVideoUrl } = require("../Constants/apiConstants");
const { setMovieTrailer } = require("../store/moviesSlice");
const { isEmpty } = require("lodash");


const useFetchMovieTrailer = (movieId) => {
    const dispatch = useDispatch();
    const trailer = useSelector(store => store?.movie?.movieTrailer);
    const fetchTrailer = async () => {
        const apiData = await fetch(movieVideoUrl(movieId), apiOptions);
        const jsonData = await apiData.json();
        let trailers;
        if (jsonData && jsonData.results) {
            trailers = jsonData.results.filter((elem) => {
                if (elem && elem.type === "Trailer") {
                    return true;
                }
                return false;
            });
        }
        let trailerObject;
        if (trailers && trailers.length > 0) {
            trailerObject = trailers[0];
        } else {
            trailerObject = jsonData.results[0];
        }
        dispatch(setMovieTrailer(trailerObject))
    }

    useEffect(() => {
        if (isEmpty(trailer)) {
            fetchTrailer()
        }
    }, [])
}

export default useFetchMovieTrailer;
