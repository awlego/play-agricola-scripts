// Configuration
const USERNAME = "awlego";
const MAX_PAGES = 50; // Maximum number of pages to scan
const ITEMS_PER_PAGE = 100; // Items per page
const MIN_UNIQUE_CARDS = 4107; // Target number of unique cards to collect
const MAX_CONSECUTIVE_EMPTY_PAGES = 3; // Stop if we hit this many pages with no new cards

// Function to fetch a page of cards
async function fetchCardPage(page = 1) {
  // Calculate starting position based on page number and items per page
  const startPos = ((page - 1) * ITEMS_PER_PAGE) + 1;
  
  const formData = new URLSearchParams();
  formData.append('s', 'new');        // Sort by new
  formData.append('v', 'all');         // View 10 items per page
  formData.append('p', startPos);     // Start position for cards
  formData.append('i', ITEMS_PER_PAGE); // Items per page
  formData.append('m', '');
  formData.append('parm', '');
  formData.append('parm2', '');
  formData.append('parm3', '');
  formData.append('parm4', '1');
  formData.append('parm5', '-13');
  formData.append('user', USERNAME);
  formData.append('password', '');    // We don't need to send password for just viewing
  formData.append('reg', '3');

  console.log(`Fetching page ${page} (starting position: ${startPos})...`);
  
  try {
    const response = await fetch('http://play-agricola.com/Agricola/Cards/index.php', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch page ${page}:`, error);
    return null;
  }
}

// Function to extract card data from HTML
function extractCardsFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const cards = [];
  
  // Find all card rows
  const rows = doc.querySelectorAll('tr');
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Check if this is a card row by looking for hidden input with id starting with 'id'
    const idInput = row.querySelector('input[id^="id"]');
    
    if (idInput) {
      // Get the card index from the input id (e.g., "id17" -> 17)
      const cardIndex = idInput.id.replace('id', '');
      const cardId = idInput.value;
      
      // Skip rows with card ID 0 (these are the "Unknown" entries)
      if (cardId === '0') {
        continue;
      }
      
      // Get the card name
      const nameElement = row.querySelector(`td[id="crdname${cardIndex}"], td[id=" crdname${cardIndex}"]`);
      const cardName = nameElement ? nameElement.textContent.trim() : "Unknown";
      
      // Skip entries with "Unknown" name
      if (cardName === "Unknown") {
        continue;
      }
      
      // Get the card type
      const typeElement = row.querySelector(`td[id="crdtype${cardIndex}"], td[id=" crdtype${cardIndex}"]`);
      const cardType = typeElement ? typeElement.textContent.trim() : "Unknown";
      
      // Get votes
      const yesInput = row.querySelector(`input[id="yes${cardIndex}"]`);
      const noInput = row.querySelector(`input[id="no${cardIndex}"]`);
      const sumInput = row.querySelector(`input[id="sum${cardIndex}"]`);
      
      const yesVotes = yesInput ? parseInt(yesInput.value) || 0 : 0;
      const noVotes = noInput ? parseInt(noInput.value) || 0 : 0;
      const sumVotes = sumInput ? parseInt(sumInput.value) || 0 : 0;
      
      // Get card ID from crddeck attribute
      let crdDeckId = "";
      const crddeck = row.querySelector(`a[id="crddeck${cardIndex}"], a[id=" crddeck${cardIndex}"]`);
      if (crddeck) {
        crdDeckId = crddeck.id.replace(/\s+/g, '');
      }
      
      // Get vote text which sometimes has more info
      const voteElement = row.querySelector(`td[id="vote${cardIndex}"], td[id=" vote${cardIndex}"]`);
      let voteText = "";
      if (voteElement) {
        // Find the part with Y/N votes (e.g., "0Y,0N" or "1Y,1N,1??")
        const voteMatches = voteElement.textContent.match(/(\d+)Y,(\d+)N/);
        if (voteMatches) {
          voteText = `${voteMatches[1]}Y,${voteMatches[2]}N`;
        }
      }
      
      cards.push({
        index: cardIndex,
        id: cardId,
        crdDeckId: crdDeckId,
        name: cardName,
        type: cardType,
        yesVotes: yesVotes,
        noVotes: noVotes,
        sumVotes: sumVotes,
        voteText: voteText
      });
    }
  }
  
  return cards;
}

// Main function to scan all cards and extract card data
async function scanAllCards() {
  console.log("Starting to scan for Agricola cards...");
  console.log(`Target: At least ${MIN_UNIQUE_CARDS} unique cards or ${MAX_PAGES} pages`);
  
  const allCards = [];
  const seenCardIds = new Set(); // Track seen card IDs to prevent duplicates
  let consecutiveEmptyPages = 0; // Track pages with no new cards
  
  // Create progress element to show on page
  const progressElement = document.createElement('div');
  progressElement.style.position = 'fixed';
  progressElement.style.top = '10px';
  progressElement.style.right = '10px';
  progressElement.style.padding = '10px';
  progressElement.style.backgroundColor = '#f8f9fa';
  progressElement.style.border = '1px solid #ccc';
  progressElement.style.borderRadius = '5px';
  progressElement.style.zIndex = '9999';
  document.body.appendChild(progressElement);
  
  // Update progress display
  function updateProgress(page, totalCards) {
    progressElement.innerHTML = `
      <strong>Scanning Cards...</strong><br>
      Page: ${page}<br>
      Unique Cards: ${totalCards}<br>
      Target: ${MIN_UNIQUE_CARDS}
    `;
  }
  
  // Scan through pages
  for (let page = 1; page <= MAX_PAGES; page++) {
    updateProgress(page, allCards.length);
    
    const html = await fetchCardPage(page);
    
    if (!html) {
      console.error(`Failed to fetch page ${page}, stopping scan.`);
      break;
    }
    
    const cards = extractCardsFromHTML(html);
    
    if (cards.length === 0) {
      console.log(`No cards found on page ${page}, stopping scan.`);
      break;
    }
    
    // Debug: log all card IDs on this page
    console.log(`Page ${page} - All Card IDs: ${cards.map(c => c.id).join(', ')}`);
    
    // Filter out duplicates and add to master list
    let newCards = 0;
    
    for (const card of cards) {
      // Only add if we haven't seen this card ID before
      if (!seenCardIds.has(card.id)) {
        seenCardIds.add(card.id);
        allCards.push(card);
        newCards++;
        
        // Log each unique card as it's found
        console.log(`Page ${page} - New unique card: ${card.name} (ID: ${card.id}, Type: ${card.type})`);
      }
    }
    
    console.log(`Found ${cards.length} cards on page ${page}, added ${newCards} new unique cards`);
    
    // Check if we found any new cards
    if (newCards === 0) {
      consecutiveEmptyPages++;
      console.log(`No new cards found on page ${page} (${consecutiveEmptyPages}/${MAX_CONSECUTIVE_EMPTY_PAGES})`);
      
      if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY_PAGES) {
        console.log(`Hit ${MAX_CONSECUTIVE_EMPTY_PAGES} consecutive pages with no new cards, stopping scan.`);
        break;
      }
    } else {
      // Reset counter if we found new cards
      consecutiveEmptyPages = 0;
    }
    
    // Check if we've reached our target card count
    if (allCards.length >= MIN_UNIQUE_CARDS) {
      console.log(`Reached target of ${MIN_UNIQUE_CARDS} unique cards, stopping scan.`);
      break;
    }
    
    // Add a small delay to avoid overwhelming the server
    if (page < MAX_PAGES) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Remove progress element
  document.body.removeChild(progressElement);
  
  console.log(`Total unique cards found: ${allCards.length}`);
  
  // Sort cards by yes votes (highest first)
  allCards.sort((a, b) => b.yesVotes - a.yesVotes);
  
  // Format results for display
  console.log("==========================================");
  console.log("CARD DATA SUMMARY");
  console.log("==========================================");
  
  // Generate a table view for console
  console.table(allCards);
  
  // Generate CSV for easy export
  let csv = "id,crdDeckId,name,type,yesVotes,noVotes,sumVotes,voteText\n";
  
  for (const card of allCards) {
    csv += `${card.id},"${card.crdDeckId}","${card.name.replace(/"/g, '""')}","${card.type}",${card.yesVotes},${card.noVotes},${card.sumVotes},"${card.voteText}"\n`;
  }
  
  console.log("==========================================");
  console.log("CSV DATA (copy and paste into a .csv file)");
  console.log("==========================================");
  console.log(csv);
  
  // Create a download link for the CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agricola_cards.csv';
  a.textContent = 'Download CSV';
  a.style.display = 'block';
  a.style.margin = '20px';
  a.style.padding = '10px';
  a.style.backgroundColor = '#f0f0f0';
  a.style.textAlign = 'center';
  a.style.borderRadius = '5px';
  
  // Add to page
  document.body.appendChild(a);
  
  // Add high-vote cards section
  const highVotedCards = allCards.filter(card => card.yesVotes >= 4);
  
  if (highVotedCards.length > 0) {
    console.log("==========================================");
    console.log(`CARDS WITH 4+ YES VOTES: ${highVotedCards.length}`);
    console.log("==========================================");
    console.table(highVotedCards);
    
    // Create a "Add all high-voted cards" button
    const addButton = document.createElement('button');
    addButton.textContent = `Add All ${highVotedCards.length} High-Voted Cards to Collection`;
    addButton.style.display = 'block';
    addButton.style.margin = '20px';
    addButton.style.padding = '10px';
    addButton.style.backgroundColor = '#e0f0e0';
    addButton.style.textAlign = 'center';
    addButton.style.borderRadius = '5px';
    addButton.style.cursor = 'pointer';
    
    addButton.onclick = () => {
      const collectionName = prompt("Enter collection name:", "top-rated-cards");
      if (collectionName) {
        const password = prompt("Enter your password:");
        if (password) {
          addCardsToCollection(highVotedCards, collectionName, USERNAME, password);
        }
      }
    };
    
    document.body.appendChild(addButton);
    
    // Create buttons for filtering by card type
    const cardTypes = [...new Set(allCards.map(card => card.type))].sort();
    
    const filterSection = document.createElement('div');
    filterSection.style.margin = '20px';
    filterSection.style.padding = '10px';
    filterSection.style.backgroundColor = '#f8f9fa';
    filterSection.style.borderRadius = '5px';
    filterSection.innerHTML = '<h3>Filter Cards by Type</h3>';
    
    cardTypes.forEach(type => {
      const cardsOfType = allCards.filter(card => card.type === type);
      const filterButton = document.createElement('button');
      filterButton.textContent = `${type} (${cardsOfType.length})`;
      filterButton.style.margin = '5px';
      filterButton.style.padding = '8px';
      filterButton.style.backgroundColor = '#e9ecef';
      filterButton.style.border = '1px solid #ced4da';
      filterButton.style.borderRadius = '3px';
      filterButton.style.cursor = 'pointer';
      
      filterButton.onclick = () => {
        console.log(`==========================================`);
        console.log(`CARDS OF TYPE: ${type} (${cardsOfType.length})`);
        console.log(`==========================================`);
        console.table(cardsOfType);
        
        // Add button to add these cards to collection
        const addTypeButton = document.createElement('button');
        addTypeButton.textContent = `Add All ${cardsOfType.length} ${type} Cards to Collection`;
        addTypeButton.style.display = 'block';
        addTypeButton.style.margin = '20px';
        addTypeButton.style.padding = '10px';
        addTypeButton.style.backgroundColor = '#e0f0e0';
        addTypeButton.style.textAlign = 'center';
        addTypeButton.style.borderRadius = '5px';
        addTypeButton.style.cursor = 'pointer';
        
        addTypeButton.onclick = () => {
          const collectionName = prompt(`Enter collection name for ${type} cards:`, `${type}-cards`);
          if (collectionName) {
            const password = prompt("Enter your password:");
            if (password) {
              addCardsToCollection(cardsOfType, collectionName, USERNAME, password);
            }
          }
        };
        
        // Add to page if it doesn't exist yet
        if (!document.getElementById(`add-${type}-button`)) {
          addTypeButton.id = `add-${type}-button`;
          document.body.appendChild(addTypeButton);
        }
      };
      
      filterSection.appendChild(filterButton);
    });
    
    document.body.appendChild(filterSection);
  }
  
  return {
    cards: allCards,
    csv: csv,
    downloadLink: a,
    highVotedCards: highVotedCards
  };
}

// Function to add multiple cards to collection
async function addCardsToCollection(cards, collectionName, username, password) {
  console.log(`Adding ${cards.length} cards to collection "${collectionName}"...`);
  
  // Create a progress element
  const progressElement = document.createElement('div');
  progressElement.style.position = 'fixed';
  progressElement.style.top = '10px';
  progressElement.style.right = '10px';
  progressElement.style.padding = '10px';
  progressElement.style.backgroundColor = '#f8f9fa';
  progressElement.style.border = '1px solid #ccc';
  progressElement.style.borderRadius = '5px';
  progressElement.style.zIndex = '9999';
  document.body.appendChild(progressElement);
  
  const results = [];
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    
    // Update progress display
    progressElement.innerHTML = `
      <strong>Adding Cards to Collection</strong><br>
      Progress: ${i + 1}/${cards.length}<br>
      Success: ${successful}<br>
      Failed: ${failed}
    `;
    
    console.log(`Adding ${card.name} (ID: ${card.id})...`);
    
    try {
      const formData = new URLSearchParams();
      formData.append('id', card.id);
      formData.append('action', '11'); // Action code for adding to collection
      formData.append('x1', collectionName);
      formData.append('x2', '0');
      formData.append('user', username);
      formData.append('password', password);
      formData.append('fake', '');
      formData.append('ut', '');
      
      const response = await fetch('http://play-agricola.com/Agricola/Cards/saveCard.php', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      
      const result = await response.text();
      results.push({ success: true, card, result });
      successful++;
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Failed to add card ${card.name}:`, error);
      results.push({ success: false, card, error });
      failed++;
    }
  }
  
  // Remove progress element
  document.body.removeChild(progressElement);
  
  // Show summary
  console.log(`Added ${successful} of ${cards.length} cards to collection "${collectionName}"`);
  
  // Create a summary notification
  const notification = document.createElement('div');
  notification.style.padding = '10px';
  notification.style.margin = '20px';
  notification.style.backgroundColor = successful === cards.length ? '#d4edda' : '#fff3cd';
  notification.style.border = '1px solid ' + (successful === cards.length ? '#c3e6cb' : '#ffeeba');
  notification.style.borderRadius = '5px';
  notification.style.textAlign = 'center';
  notification.innerHTML = `
    <h3>Cards Added to Collection "${collectionName}"</h3>
    <p>Successfully added ${successful} of ${cards.length} cards.</p>
    ${failed > 0 ? `<p>Failed to add ${failed} cards.</p>` : ''}
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove notification after 10 seconds
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 10000);
  
  return results;
}

// Run the script and return the results
scanAllCards();