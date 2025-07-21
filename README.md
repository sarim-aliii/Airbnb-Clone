Wanderlust - A Full-Stack Airbnb Clone

Wanderlust is a feature-rich, full-stack web application inspired by Airbnb. It allows users to browse, create, and review property listings. The project is built using the MEN (MongoDB, Express.js, Node.js) stack and demonstrates a wide range of web development concepts including user authentication, image uploads, maps, and a RESTful API structure.

**Live Demo**: https://airbnb-clone-hj4h.onrender.com/ 


***Key Features***
RESTful API Design: Follows REST principles for all listing and review operations.

User Authentication & Authorization: Secure user sign-up and login functionality using Passport.js. Users can only 
edit or delete their own listings.

Image Uploads: Integrates with Cloudinary for seamless cloud-based image hosting and management.

Interactive Maps: Utilizes the Mapbox API to display the location of each property on an interactive map.

Full CRUD Functionality: Users can Create, Read, Update, and Delete property listings and reviews.

Server-Side Rendering: Uses EJS templating with EJS-Mate for layouts to render dynamic content.

Data Validation: Implements server-side schema validation with Joi to ensure data integrity.

Flash Messages: Provides user feedback for actions like successfully creating a listing or encountering an error.

Responsive Design: Styled with Bootstrap to be functional and visually appealing across different devices.


***Technologies Used***
This project is built with the following technologies:

**Backend**
Node.js: JavaScript runtime environment.
Express.js: Web application framework for Node.js.
Mongoose: ODM library for MongoDB and Node.js.

**Frontend**
EJS (Embedded JavaScript): Templating engine to generate dynamic HTML.
Bootstrap 5: CSS framework for responsive and modern design.
Mapbox GL JS: JavaScript library for interactive maps.

**Database**
MongoDB (via Atlas): NoSQL cloud database for storing user and listing data.

**Authentication**
Passport.js: Authentication middleware for Node.js (with passport-local and passport-local-mongoose strategies).
Express Session & Connect-Mongo: Manages user sessions and stores them in MongoDB.

**Image Hosting & Management**
Cloudinary: Cloud service for image uploads and storage.
Multer & multer-storage-cloudinary: Middleware for handling multipart/form-data, used for file uploads.

**Deployment**
Render: Cloud application hosting platform.



**Setup and Local Installation**
To run this project locally, follow these steps:

1. Prerequisites:
Node.js (Version 20.x or compatible)
Git

2. Clone the Repository:
git clone https://github.com/sarim-aliii/Airbnb-Clone
cd Airbnb-Clone

3. Install Dependencies:
npm install

4. Set Up Environment Variables:
Create a .env file in the root of the project and add the following variables. 

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>

# MongoDB Connection String (from MongoDB Atlas)
ATLASDB_URL=mongodb+srv://<user>:<password>@cluster_url/wanderlust?retryWrites=true&w=majority

# Mapbox API Token
MAP_TOKEN=<your_mapbox_access_token>

# Secret for Express Session
SECRET=<yourSecretCode>

5. Run the Application:
Run the app directly with Node.js.
node app.js

```The server should now be running on `http://localhost:8080`.


## License
This project is licensed under the **ISC License**.