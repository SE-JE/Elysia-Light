import { Location, Product, ProductCategory, ProductLocation } from "@models";

export default async function UserSeeder() {
    // =========================>
    // ## Seed the application's database
    // =========================>
    await ProductCategory.create({
        id: 1,
        name: "Minuman",
    });

    await ProductCategory.create({
        id: 2,
        name: "Makanan",
    });

    await Product.create({
        id: 1,
        name: "Kopi",
        description: "",
        price: 5000,
        buy_price: 4000,
        product_category_id: 1,
    });

    await Product.create({
        id: 2,
        name: "Es Teh",
        description: "",
        price: 4000,
        buy_price: 3500,
        product_category_id: 1,
    });

    await Product.create({
        id: 3,
        name: "Mie Goreng",
        description: "",
        price: 8000,
        buy_price: 5500,
        product_category_id: 2,
    });

    await Location.create({
        id: 1,
        name: "Lokasi 1",
    });

    await Location.create({
        id: 2,
        name: "Lokasi 2",
    });

    await ProductLocation.create({
        id: 1,
        product_id: 1,
        location_id: 1
    });

    await ProductLocation.create({
        id: 1,
        product_id: 1,
        location_id: 2
    });
}
