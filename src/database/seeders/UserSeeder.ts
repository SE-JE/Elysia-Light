import bcrypt from "bcrypt";
import { User } from "@models";

export default async function UserSeeder() {
    // =========================>
    // ## Seed the application's database
    // =========================>
    const password: string  = await bcrypt.hash("password", 10)
    
    await User.query().create({
        name: "Admin",
        email: "admin@example.com",
        email_verification_at: new Date(),
        password: password
    });
}
