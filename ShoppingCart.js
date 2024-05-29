class ShoppingCart {
  constructor() {
    this.items = [];
    this.discount = 0;
  }

  addItem(item) {
    this.items.push(item);
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
    } else {
      console.error('Invalid index');
    }
  }

  getTotalPrice() {
    let totalPrice = 0;
    for (const item of this.items) {
      totalPrice += item.price;
    }
    return totalPrice - this.discount;
  }

  applyDiscount(amount) {
    this.discount = amount;
  }

  displayItems() {
    console.log('Shopping Cart Items:');
    this.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - $${item.price}`);
    });
  }

  clearCart() {
    this.items = [];
    this.discount = 0;
    console.log('Cart cleared.');
  }

  getItemCount() {
    return this.items.length;
  }

  getItemByName(name) {
    return this.items.find(item => item.name === name);
  }

  containsItem(name) {
    return this.items.some(item => item.name === name);
  }
}

class Item {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }
}

// Example usage
const cart = new ShoppingCart();

const item1 = new Item('Laptop', 1000);
const item2 = new Item('Phone', 800);
const item3 = new Item('Headphones', 100);

cart.addItem(item1);
cart.addItem(item2);
cart.addItem(item3);

cart.displayItems();
console.log('Total Price:', cart.getTotalPrice());

console.log('Applying discount of $200...');
cart.applyDiscount(200);
console.log('Total Price (after discount):', cart.getTotalPrice());

console.log('Removing item at index 1...');
cart.removeItem(1);
cart.displayItems();
console.log('Total Price:', cart.getTotalPrice());

console.log('Total number of items in the cart:', cart.getItemCount());

console.log('Getting item by name:');
console.log(cart.getItemByName('Laptop'));

console.log('Is "Phone" in the cart?', cart.containsItem('Phone'));

console.log('Clearing cart...');
cart.clearCart();
cart.displayItems();
console.log('Total Price:', cart.getTotalPrice());

// Example array of cart items
const cartItems = [
    { name: "Item 1", price: 29.99, quantity: 1 },
    { name: "Item 2", price: 49.99, quantity: 2 },
    { name: "Item 3", price: 9.99, quantity: 5 }
];

// Function to calculate the total value of the cart
function calculateTotal(cartItems) {
    let totalValue = 0;

    cartItems.forEach(item => {
        totalValue += item.price * item.quantity;
    });

    return totalValue.toFixed(2); // Returns the total value as a string with 2 decimal places
}

// Function to display the cart items and total value
function displayCart(cartItems) {
    const cartItemsDiv = document.getElementById("cart-items");
    const totalValueSpan = document.getElementById("total-value");

    cartItemsDiv.innerHTML = "";
    cartItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.textContent = `${item.name} - $${item.price} x ${item.quantity}`;
        cartItemsDiv.appendChild(itemDiv);
    });

    const totalValue = calculateTotal(cartItems);
    totalValueSpan.textContent = totalValue;
}

// Initialize the cart display
displayCart(cartItems);

