/**
 * Analyze and process Spotify streaming data
 */
export const analyzeStreamingData = async (rawData: any[]): Promise<any[]> => {
  console.log(`Analyzing ${rawData.length} streaming entries...`);
  
  // Basic validation
  if (!Array.isArray(rawData) || rawData.length === 0) {
    throw new Error('Invalid or empty data provided');
  }
  
  // Check for required fields
  const firstItem = rawData[0];
  const requiredFields = ['ts', 'ms_played'];
  
  for (const field of requiredFields) {
    if (!(field in firstItem)) {
      throw new Error(`Missing required field: ${field}. This doesn't appear to be valid Spotify streaming data.`);
    }
  }
  
  // Process and clean the data
  const processedData = rawData
    .filter(item => {
      // Filter out invalid entries
      if (!item.ts || typeof item.ms_played !== 'number') {
        return false;
      }
      
      // Filter out very short plays (less than 30 seconds)
      if (item.ms_played < 30000) {
        return false;
      }
      
      return true;
    })
    .map(item => {
      // Standardize and enhance each entry
      return {
        ...item,
        // Ensure timestamp is properly formatted
        ts: typeof item.ts === 'string' ? item.ts : new Date(item.ts).toISOString(),
        // Add derived fields
        date: new Date(item.ts).toISOString().split('T')[0],
        hour: new Date(item.ts).getHours(),
        dayOfWeek: new Date(item.ts).getDay(),
        // Normalize boolean fields
        skipped: Boolean(item.skipped),
        shuffle: Boolean(item.shuffle),
        offline_timestamp: Boolean(item.offline_timestamp),
        // Clean up track/artist names
        master_metadata_track_name: item.master_metadata_track_name?.trim() || '',
        master_metadata_album_artist_name: item.master_metadata_album_artist_name?.trim() || '',
        master_metadata_album_album_name: item.master_metadata_album_album_name?.trim() || '',
        // Calculate duration in minutes for easier analysis
        duration_minutes: (item.ms_played || 0) / (1000 * 60)
      };
    })
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()); // Sort by timestamp
  
  console.log(`Processed ${processedData.length} valid entries (filtered out ${rawData.length - processedData.length})`);
  
  return processedData;
};

/**
 * Remove duplicate entries from streaming data
 */
export const removeDuplicates = (data: any[]): any[] => {
  const seen = new Set<string>();
  
  return data.filter(item => {
    // Create a unique key for each entry
    const key = `${item.ts}-${item.master_metadata_track_name}-${item.ms_played}-${item.master_metadata_album_artist_name}`;
    
    if (seen.has(key)) {
      return false;
    }
    
    seen.add(key);
    return true;
  });
};

/**
 * Merge multiple data arrays and remove duplicates
 */
export const mergeStreamingData = (existingData: any[], newData: any[]): any[] => {
  const combined = [...existingData, ...newData];
  const deduplicated = removeDuplicates(combined);
  
  console.log(`Merged ${existingData.length} + ${newData.length} = ${combined.length} entries`);
  console.log(`After deduplication: ${deduplicated.length} entries`);
  
  return deduplicated.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
};
