/**
 * Safe clipboard copy utility with multiple fallback methods
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Try the modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ Clipboard API: Text copied successfully');
      return true;
    } catch (err) {
      console.warn('⚠️ Clipboard API failed, trying fallback methods:', err);
    }
  }
  
  // Method 2: Fallback using execCommand with improved textarea approach
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Styling to make it invisible but functional
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', ''); // Prevent keyboard from showing on mobile
    
    document.body.appendChild(textArea);
    
    // iOS Safari specific handling
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, textArea.value.length);
    } else {
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);
    }
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log('✅ execCommand: Text copied successfully');
      return true;
    } else {
      throw new Error('execCommand returned false');
    }
  } catch (fallbackErr) {
    console.error('❌ execCommand fallback failed:', fallbackErr);
  }
  
  // Method 3: Last resort - create a temporary input element
  try {
    const input = document.createElement('input');
    input.value = text;
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.setAttribute('readonly', '');
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(input);
    
    if (successful) {
      console.log('✅ Input element fallback: Text copied successfully');
      return true;
    }
  } catch (inputErr) {
    console.error('❌ Input element fallback failed:', inputErr);
  }
  
  // All methods failed
  console.error('❌ All clipboard copy methods failed');
  return false;
}
