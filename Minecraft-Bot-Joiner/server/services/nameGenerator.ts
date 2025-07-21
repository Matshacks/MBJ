// Believable Minecraft username generator
const firstNames = [
  'Alex', 'Steve', 'Luna', 'Max', 'Emma', 'Jake', 'Zoe', 'Noah', 'Lily', 'Sam',
  'Kai', 'Maya', 'Leo', 'Aria', 'Finn', 'Nora', 'Cole', 'Ruby', 'Jack', 'Ivy',
  'Owen', 'Mia', 'Liam', 'Eva', 'Luke', 'Sky', 'Ryan', 'Sage', 'Dean', 'Rose',
  'Blake', 'Jade', 'Gray', 'Belle', 'Cruz', 'Wren', 'Knox', 'Faye', 'Jude', 'Vale'
];

const suffixes = [
  'Gaming', 'Pro', 'Master', 'Craft', 'Build', 'Mine', 'Player', 'Hero',
  '2024', '99', '101', 'X', 'Z', 'MC', 'YT', 'TTV', 'Live', 'Stream',
  'Builder', 'Miner', 'Crafter', 'Legend', 'King', 'Queen', 'Boss', 'Elite',
  'Gamer', 'Noob', 'Newbie', 'Rookie', 'Veteran', 'Expert', 'Ninja', 'Wizard'
];

const adjectives = [
  'Cool', 'Epic', 'Awesome', 'Super', 'Mega', 'Ultra', 'Shadow', 'Dark',
  'Light', 'Fire', 'Ice', 'Storm', 'Thunder', 'Swift', 'Silent', 'Wild',
  'Brave', 'Bold', 'Lucky', 'Smart', 'Quick', 'Strong', 'Mystic', 'Golden',
  'Silver', 'Diamond', 'Emerald', 'Ruby', 'Crystal', 'Neon', 'Cyber', 'Digital'
];

const usedNames = new Set<string>();

export function generateRandomUsername(): string {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const nameType = Math.random();
    let username = '';
    
    if (nameType < 0.4) {
      // FirstName + Suffix (40% chance)
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      username = `${firstName}${suffix}`;
    } else if (nameType < 0.7) {
      // Adjective + FirstName (30% chance)
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      username = `${adjective}${firstName}`;
    } else {
      // FirstName + Number (30% chance)
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = Math.floor(Math.random() * 9999) + 1;
      username = `${firstName}${number}`;
    }
    
    // Add random variation occasionally
    if (Math.random() < 0.1) {
      username += ['_', 'X', 'Z'][Math.floor(Math.random() * 3)];
    }
    
    // Ensure it's not too long and hasn't been used
    if (username.length <= 16 && !usedNames.has(username)) {
      usedNames.add(username);
      return username;
    }
    
    attempts++;
  }
  
  // Fallback if all attempts fail
  const fallback = `Player${Math.floor(Math.random() * 99999)}`;
  usedNames.add(fallback);
  return fallback;
}

export function releaseUsername(username: string): void {
  usedNames.delete(username);
}