// Configuration
const USERNAME = "awlego";
const COLLECTION_NAME = "test-collection";
const CARD_ID = "12411"; // Specific card ID to add

// Function to add a card to collection
async function addCardToCollection(cardId, collectionName, username, password) {
  const formData = new URLSearchParams();
  formData.append('id', cardId);
  formData.append('action', '11'); // Action code for adding to collection
  formData.append('x1', collectionName);
  formData.append('x2', '0');
  formData.append('user', username);
  formData.append('password', password);
  formData.append('fake', '');
  formData.append('ut', '');
  
  console.log(`Attempting to add card ${cardId} to collection "${collectionName}"...`);
  
  try {
    const response = await fetch('http://play-agricola.com/Agricola/Cards/saveCard.php', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    const result = await response.text();
    console.log(`Server response:`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`Failed to add card ${cardId}:`, error);
    return { success: false, error };
  }
}

// Main function to add the specific card
async function addSpecificCard() {
  // Get password securely
  const password = prompt("Enter your password to add the card:");
  if (!password) {
    console.log("Operation cancelled - no password provided");
    return;
  }
  
  // Confirm before adding
  const confirmMsg = `Add card ${CARD_ID} to collection "${COLLECTION_NAME}"?`;
  if (!confirm(confirmMsg)) {
    console.log("Operation cancelled by user");
    return;
  }
  
  // Add the card
  const result = await addCardToCollection(CARD_ID, COLLECTION_NAME, USERNAME, password);
  
  // Show result
  if (result.success) {
    console.log(`Successfully added card ${CARD_ID} to collection "${COLLECTION_NAME}"`);
  } else {
    console.log(`Failed to add card ${CARD_ID} to collection "${COLLECTION_NAME}"`);
  }
}

// Run the script
addSpecificCard();