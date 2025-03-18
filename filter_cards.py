import csv

# Read the input CSV file
with open('cards.csv', 'r') as input_file:
    csv_reader = csv.DictReader(input_file)
    
    # Store rows that meet the criteria
    filtered_rows = []
    
    # Get the header
    fieldnames = csv_reader.fieldnames
    
    # Filter rows where sumVotes >= 3
    for row in csv_reader:
        if int(row['sumVotes']) >= 3:
            filtered_rows.append(row)
    
    # Write the filtered data to a new CSV file
    with open('filtered_cards.csv', 'w', newline='') as output_file:
        csv_writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        csv_writer.writeheader()
        csv_writer.writerows(filtered_rows)

print(f"Filtered {len(filtered_rows)} cards with sumVotes >= 3")
