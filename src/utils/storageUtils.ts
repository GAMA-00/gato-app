
import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to check and fix Content-Type of files in Supabase Storage
 */
export const verifyFileContentType = async (bucketName: string, filePath: string): Promise<{
  exists: boolean;
  contentType?: string;
  isCorrect?: boolean;
}> => {
  try {
    console.log(`=== VERIFYING FILE: ${bucketName}/${filePath} ===`);
    
    // Get file info from storage
    const { data: fileList, error } = await supabase.storage
      .from(bucketName)
      .list(filePath.split('/').slice(0, -1).join('/'));
    
    if (error) {
      console.error('Error listing files:', error);
      return { exists: false };
    }
    
    const fileName = filePath.split('/').pop();
    const file = fileList?.find(f => f.name === fileName);
    
    if (!file) {
      console.log('File not found in storage');
      return { exists: false };
    }
    
    console.log('File found:', file);
    console.log('File metadata:', file.metadata);
    
    // Check if it's an image file based on extension
    const isImageFile = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName || '');
    const currentContentType = file.metadata?.mimetype || 'unknown';
    
    console.log('Is image file (by extension):', isImageFile);
    console.log('Current Content-Type:', currentContentType);
    
    const isCorrect = isImageFile ? currentContentType.startsWith('image/') : true;
    
    return {
      exists: true,
      contentType: currentContentType,
      isCorrect
    };
    
  } catch (error) {
    console.error('Error verifying file content type:', error);
    return { exists: false };
  }
};

/**
 * Fix Content-Type for images that were uploaded with wrong mimetype
 */
export const fixImageContentType = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    console.log(`=== FIXING CONTENT-TYPE: ${bucketName}/${filePath} ===`);
    
    // First, download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);
    
    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return false;
    }
    
    // Determine correct content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let correctContentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        correctContentType = 'image/jpeg';
        break;
      case 'png':
        correctContentType = 'image/png';
        break;
      case 'gif':
        correctContentType = 'image/gif';
        break;
      case 'webp':
        correctContentType = 'image/webp';
        break;
      case 'svg':
        correctContentType = 'image/svg+xml';
        break;
    }
    
    console.log('Determined correct content type:', correctContentType);
    
    // Re-upload the file with correct content type
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        cacheControl: '3600',
        upsert: true,
        contentType: correctContentType
      });
    
    if (uploadError) {
      console.error('Error re-uploading file with correct content type:', uploadError);
      return false;
    }
    
    console.log('✅ File content type fixed successfully');
    return true;
    
  } catch (error) {
    console.error('Error fixing content type:', error);
    return false;
  }
};

/**
 * Batch fix content types for all images in a bucket
 */
export const batchFixImageContentTypes = async (bucketName: string, folderPath: string = ''): Promise<{
  fixed: number;
  errors: number;
  details: Array<{ path: string; success: boolean; error?: string }>;
}> => {
  const results = {
    fixed: 0,
    errors: 0,
    details: [] as Array<{ path: string; success: boolean; error?: string }>
  };
  
  try {
    console.log(`=== BATCH FIXING CONTENT-TYPES IN: ${bucketName}/${folderPath} ===`);
    
    // List all files in the bucket/folder
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);
    
    if (error) {
      console.error('Error listing files:', error);
      return results;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found');
      return results;
    }
    
    console.log(`Found ${files.length} files to check`);
    
    for (const file of files) {
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
      
      // Skip directories
      if (!file.name.includes('.')) {
        console.log('Skipping directory:', file.name);
        continue;
      }
      
      // Check if it's an image file
      const isImageFile = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      
      if (!isImageFile) {
        console.log('Skipping non-image file:', file.name);
        continue;
      }
      
      // Verify current content type
      const verification = await verifyFileContentType(bucketName, filePath);
      
      if (!verification.exists) {
        results.details.push({
          path: filePath,
          success: false,
          error: 'File not found'
        });
        results.errors++;
        continue;
      }
      
      if (verification.isCorrect) {
        console.log('File already has correct content type:', filePath);
        results.details.push({
          path: filePath,
          success: true
        });
        continue;
      }
      
      // Fix the content type
      const fixed = await fixImageContentType(bucketName, filePath);
      
      if (fixed) {
        results.fixed++;
        results.details.push({
          path: filePath,
          success: true
        });
      } else {
        results.errors++;
        results.details.push({
          path: filePath,
          success: false,
          error: 'Failed to fix content type'
        });
      }
    }
    
    console.log(`=== BATCH FIX COMPLETE ===`);
    console.log(`Fixed: ${results.fixed}, Errors: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    console.error('Error in batch fix:', error);
    return results;
  }
};
