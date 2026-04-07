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
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(account.email);
        console.log(`User ${account.email} already exists in Auth.`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`Creating user ${account.email} in Auth...`);
          userRecord = await auth.createUser({
            email: account.email,
            password: account.password,
            displayName: account.displayName,
          });
          console.log(`User ${account.email} created in Auth.`);
        } else {
          throw error;
        }
      }

      // Ensure Firestore profile exists
      const userDoc = await db.collection("users").doc(userRecord.uid).get();
      if (!userDoc.exists) {
        console.log(`Creating Firestore profile for ${account.email}...`);
        await db.collection("users").doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: account.email,
          username: account.username,
          displayName: account.displayName,
          balance: account.balance,
          role: account.role,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Firestore profile for ${account.email} created.`);
      } else {
        // Update balance if it's a demo account to ensure it's always ready
        await db.collection("users").doc(userRecord.uid).update({
          balance: account.balance
        });
        console.log(`Firestore profile for ${account.email} updated with demo balance.`);
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
