def factorial(n):
  if n == 0:
    return 1
  return n * factorial(n-1)



def is_prime(n):
  if n <= 1:
    return False
  for i in range(2, n + 1):
    if n % i == 0:
      return False
  return True





class Item:
  def __init__(self, weight):
    self.weight = weight

class Box:
  def __init__(self, capacity):
    self.capacity = capacity
    self.items = []

  def can_fit(self, item):
    return self.capacity - sum(item.weight for item in self.items) >= item.weight

  def add_item(self, item):
    if self.can_fit(item):
      self.items.append(item)

def pack_items(items, boxes):
  if not items:
    return True

  for box in boxes:
    for item in items:
      remaining_items = [i for i in items if i != item]
      if box.can_fit(item) and pack_items(remaining_items, boxes):
        box.add_item(item)
        return True
  return False

# Example usage
items = [Item(5), Item(3), Item(4), Item(1)]
boxes = [Box(10), Box(7)]

if pack_items(items.copy(), boxes):
  print("Items can be packed into the boxes")
  for box in boxes:
    print(f"Box capacity: {box.capacity}, Items: {[item.weight for item in box.items]}")
else:
  print("Items cannot be packed into the boxes")
