// Quick debug script - check what's in PageData
console.log('=== DEBUG: History Data ===');

// This would be in browser console after page load:
// console.log('History:', $page.data.history);
// console.log('Month:', $page.data.month);
// console.log('Private Expenses:', $page.data.privateExpenses);

// Server-side check:
import { getSupabaseServerClient } from './src/lib/server/supabase.js';

const supabase = getSupabaseServerClient();

// Check if expenses exist
const { data: expenses, error } = await supabase
  .from('private_expenses')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Recent expenses:', expenses);
console.log('Error:', error);
