## 💬 MERN Real-Time Chatroom with Audio Calling

This is a full-stack real-time chat application built using the MERN stack (MongoDB, Express, React, Node.js) and enhanced with:

🔒 JWT-based Authentication  
💬 Real-Time Messaging (Socket.IO)  
📁 File Uploads (Images, Videos, PDFs)  
📞 Audio Calling (WebRTC)  
🧑‍💼 Admin Controls (Manage Users & Messages)  

🌐 Deployed on Render (Backend) and Vercel (Frontend)  

# 📂 Project Structure

chatroom/  
├── client/             # React frontend  
│   ├── src/  
│   │   ├── pages/      # ChatRoom, Login, Register, AdminDashboard  
│   │   ├── components/ # CallPopup, Navbar  
│   │   ├── App.js  
│   │   └── ...  
│   └── public/  
│  
├── server/             # Node.js + Express backend  
│   ├── routes/         # auth.js, admin.js  
│   ├── models/         # User.js, Message.js  
│   ├── index.js        # Main backend + WebSocket logic  
│   └── .env  

# 🧰 Technology Stack

✅ Frontend (React)

| Module              | Purpose                       |
|---------------------|-------------------------------|
| react               | Core framework                |
| react-router-dom    | Routing (login/register/chat) |
| emoji-picker-react  | Emoji input in chat           |
| socket.io-client    | WebSocket connection to server|
| tailwindcss         | Styling                       |
| axios               | HTTP requests (login/register)|

✅ Backend (Node.js + Express)

| Module        | Purpose                         |
|---------------|---------------------------------|
| express       | API server and routing          |
| mongoose      | MongoDB interaction             |
| cors          | Enable cross-origin requests    |
| dotenv        | Load environment variables      |
| jsonwebtoken  | JWT authentication              |
| bcryptjs      | Password hashing                |
| socket.io     | Real-time messaging and signaling|

# 🔐 Authentication

JWT-based auth is used for login and protected routes.  
User roles: admin and user  
Token stored in local storage.  

# 💬 Chat Functionality

Real-time using Socket.IO  
Broadcast text or file messages to all users  
Files: Images, Videos, PDFs supported via FileReader & Base64  

# 📞 Audio Calling (WebRTC)

Used: RTCPeerConnection + navigator.mediaDevices.getUserMedia  
Signaling via Socket.IO  
ICE Candidates exchanged to establish P2P connection  
audio elements used to stream and play audio between peers  

# 🛠️ Admin Features

Admin dashboard route: /admin  
Promote user to admin, remove users  
Delete any message from the chat  

# 👤 Credits

Created by Kodali Shanmukh Chowdary as a real-time communication project with MERN + WebRTC + Socket.IO integration.  

# 📧 Contact

📩 Email: kodalishanmukh6thfinger@gmail.com  
