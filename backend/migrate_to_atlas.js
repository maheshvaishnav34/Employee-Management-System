const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/employee_management';
const ATLAS_URI = 'mongodb+srv://santoshvaishnav170_db_user:JsDngJfqvwmYpyQV@cluster0.yce8es2.mongodb.net/employee_management?appName=Cluster0';

async function migrateData() {
  console.log('🔄 Connecting to Local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  
  console.log('🔄 Connecting to Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

  // Get all collections from local DB
  const collections = await localConn.db.listCollections().toArray();
  console.log(`📦 Found ${collections.length} collections to migrate:`, collections.map(c => c.name).join(', '));

  for (const col of collections) {
    const colName = col.name;
    try {
      const localDocs = await localConn.db.collection(colName).find({}).toArray();
      console.log(`  ➜ Migrating "${colName}" — ${localDocs.length} documents`);
      
      if (localDocs.length > 0) {
        // Drop existing Atlas collection and re-insert
        await atlasConn.db.collection(colName).deleteMany({});
        await atlasConn.db.collection(colName).insertMany(localDocs);
        console.log(`  ✅ "${colName}" migrated successfully`);
      } else {
        console.log(`  ⚠️  "${colName}" is empty — skipping`);
      }
    } catch (err) {
      console.log(`  ❌ Error migrating "${colName}": ${err.message}`);
    }
  }

  console.log('\n🎉 Migration Complete! All data is now on MongoDB Atlas.');
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrateData().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
