import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const auth = admin.auth();
const db = admin.firestore();

// Bootstrap Admin User
async function bootstrapAdmin() {
  const adminEmail = "dihora04@gmail.com";
  const adminPassword = "admin123456"; // Default password for the first login
  
  try {
    try {
      await auth.getUserByEmail(adminEmail);
      console.log(`Admin user ${adminEmail} already exists.`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Creating admin user ${adminEmail}...`);
        const userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: "Admin",
        });

        await db.collection("users").doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: adminEmail,
          username: "admin",
          displayName: "Admin",
          balance: 1000000,
          role: "admin",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Admin user created successfully with password: ${adminPassword}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error bootstrapping admin:", error);
  }
}

async function startServer() {
  await bootstrapAdmin();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Admin API: Create User
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, displayName, username, balance, role } = req.body;
    
    try {
      // 1. Create Auth User
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      // 2. Create Firestore Profile
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        username: username.toLowerCase().trim(),
        displayName,
        balance: balance || 0,
        role: role || "user",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  // Mock SMM API Endpoints
  app.get("/api/smm/services", (req, res) => {
    // Mock services from an external provider
    const mockServices = [
      { id: "101", name: "Instagram Followers [Real]", category: "Instagram", rate: 50, min: 100, max: 10000 },
      { id: "102", name: "Instagram Likes [Fast]", category: "Instagram", rate: 10, min: 50, max: 5000 },
      { id: "201", name: "YouTube Views [High Retention]", category: "YouTube", rate: 120, min: 500, max: 100000 },
      { id: "301", name: "Facebook Page Likes", category: "Facebook", rate: 80, min: 100, max: 20000 },
    ];
    res.json(mockServices);
  });

  app.post("/api/smm/order", (req, res) => {
    const { service, link, quantity } = req.body;
    console.log(`Placing order for service ${service} to ${link} with quantity ${quantity}`);
    
    // Simulate API response
    const orderId = Math.floor(Math.random() * 1000000).toString();
    res.json({ order: orderId, status: "pending" });
  });

  app.get("/api/smm/status/:orderId", (req, res) => {
    const statuses = ["pending", "processing", "completed", "partial", "canceled"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    res.json({ status: randomStatus, charge: "0.50", start_count: "100", remains: "0" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
