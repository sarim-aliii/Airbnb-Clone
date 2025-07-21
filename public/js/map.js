const listing = require("../")


mapboxgl.accessToken = mapToken;   // from show.ejs
const map = new mapboxgl.Map({
    container: 'map',
    center: listing.geometry.coordinates, // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 9 // starting zoom
});



// coordinates - from show.ejs
const marker = new mapboxgl.Marker({color: 'red'})
    .setLngLat(listing.geometry.coordinates)
    .setPopup(
        new mapboxgl.Popup({offset: 25})
        .setHTML(`<h4>${listing.location}</h4><p>Exact location provided after booking</p>`)
    )
    .addTo(map);