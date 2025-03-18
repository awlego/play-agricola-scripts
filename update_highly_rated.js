// Configuration
const USERNAME = "awlego";
const COLLECTION_NAME = "plus-3-avg-vote";
const CSV_FIELD_INDEX = 0; // Index of the column containing card IDs in the CSV

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

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const cardIds = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const fields = line.split(',');
      if (fields.length > CSV_FIELD_INDEX) {
        const cardId = fields[CSV_FIELD_INDEX].trim();
        if (cardId) {
          cardIds.push(cardId);
        }
      }
    }
  }
  
  return cardIds;
}

// Main function to add cards from CSV
async function addCardsFromCSV() {
  // Get password securely
  const password = prompt("Enter your password to add the cards:");
  if (!password) {
    console.log("Operation cancelled - no password provided");
    return;
  }
  
  // Get CSV file
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  
  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    
    // Read the file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target.result;
      const cardIds = parseCSV(csvText);
      
      if (cardIds.length === 0) {
        console.log("No valid card IDs found in the CSV file");
        return;
      }
      
      // Confirm before adding
      const confirmMsg = `Add ${cardIds.length} cards to collection "${COLLECTION_NAME}"?`;
      if (!confirm(confirmMsg)) {
        console.log("Operation cancelled by user");
        return;
      }
      
      console.log(`Starting to add ${cardIds.length} cards to collection "${COLLECTION_NAME}"...`);
      
      // Add each card with a small delay to avoid overwhelming the server
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        console.log(`Processing card ${i+1}/${cardIds.length}: ID ${cardId}`);
        
        const result = await addCardToCollection(cardId, COLLECTION_NAME, USERNAME, password);
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Add a small delay between requests
        if (i < cardIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Show final results
      console.log(`Operation completed. Added ${successCount} cards successfully. Failed: ${failCount}`);
    };
    
    reader.readAsText(file);
  };
  
  fileInput.click();
}

// Run the script
addCardsFromCSV();
