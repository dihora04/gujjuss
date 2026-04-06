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

// Bootstrap Admin, Demo User and Default Services
async function bootstrapDemoAccounts() {
  const adminEmail = "dihora04@gmail.com";
  const adminPassword = "admin123456";
  
  const demoUserEmail = "user@example.com";
  const demoUserPassword = "user123456";
  
  const accounts = [
    { email: adminEmail, password: adminPassword, role: "admin", username: "admin", displayName: "Admin", balance: 1000000 },
    { email: demoUserEmail, password: demoUserPassword, role: "user", username: "demouser", displayName: "Demo User", balance: 1000000 }
  ];

  for (const account of accounts) {
    try {
      try {
        await auth.getUserByEmail(account.email);
        console.log(`User ${account.email} already exists.`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`Creating user ${account.email}...`);
          const userRecord = await auth.createUser({
            email: account.email,
            password: account.password,
            displayName: account.displayName,
          });

          await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: account.email,
            username: account.username,
            displayName: account.displayName,
            balance: account.balance,
            role: account.role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`User ${account.email} created successfully.`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error bootstrapping ${account.email}:`, error);
    }
  }

  // Bootstrap Services
  const servicesSnapshot = await db.collection("services").limit(1).get();
  if (servicesSnapshot.empty) {
    console.log("Bootstrapping default services...");
    const defaultServices = [
      { name: "Instagram Followers [Real]", category: "Instagram", rate: 50, min: 100, max: 10000, description: "High quality real followers" },
      { name: "Instagram Likes [Fast]", category: "Instagram", rate: 10, min: 50, max: 5000, description: "Instant delivery likes" },
      { name: "YouTube Views [High Retention]", category: "YouTube", rate: 120, min: 500, max: 100000, description: "Safe and high retention views" },
      { name: "Facebook Page Likes", category: "Facebook", rate: 80, min: 100, max: 20000, description: "Boost your page popularity" },
    ];

    for (const service of defaultServices) {
      await db.collection("services").add(service);
    }
    console.log("Default services bootstrapped.");
  }
}

async function startServer() {
  await bootstrapDemoAccounts();
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
