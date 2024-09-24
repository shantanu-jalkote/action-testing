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



