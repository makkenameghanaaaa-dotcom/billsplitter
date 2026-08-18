import { 
  db 
} from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  arrayUnion, 
  getDocs,
  writeBatch
} from 'firebase/firestore';

/**
 * Real-time listener for user's groups
 */
export function subscribeToGroups(userId, onUpdate, onError) {
  if (!userId) return () => {};
  
  const groupsRef = collection(db, 'groups');
  const q = query(
    groupsRef, 
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(groups);
  }, (err) => {
    console.error("Error subscribing to groups:", err);
    if (onError) onError(err);
  });
}

/**
 * Creates a new group
 */
export async function createGroup(userId, { name, baseCurrency = 'USD', members = [] }) {
  const groupsRef = collection(db, 'groups');
  const initialMembers = members.length > 0 ? members : ['You'];
  
  const docRef = await addDoc(groupsRef, {
    name,
    baseCurrency,
    createdBy: userId,
    members: initialMembers,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Deletes a group and all its subcollection expenses
 */
export async function deleteGroup(groupId) {
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const expensesSnap = await getDocs(expensesRef);
  
  const batch = writeBatch(db);
  expensesSnap.forEach((expDoc) => {
    batch.delete(expDoc.ref);
  });
  
  const groupDocRef = doc(db, 'groups', groupId);
  batch.delete(groupDocRef);

  await batch.commit();
}

/**
 * Adds a new member to an existing group
 */
export async function addMemberToGroup(groupId, memberName) {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    members: arrayUnion(memberName)
  });
}

/**
 * Real-time listener for group expenses
 */
export function subscribeToExpenses(groupId, onUpdate, onError) {
  if (!groupId) return () => {};

  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const q = query(expensesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString())
      };
    });
    onUpdate(expenses);
  }, (err) => {
    console.error("Error subscribing to expenses:", err);
    if (onError) onError(err);
  });
}

/**
 * Adds an expense to a group
 */
export async function addExpense(groupId, { description, amount, currency, paidBy, splitWith }) {
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const docRef = await addDoc(expensesRef, {
    description,
    amount: parseFloat(amount),
    currency,
    paidBy,
    splitWith: splitWith || [],
    date: new Date().toLocaleDateString(),
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Deletes an expense from a group
 */
export async function deleteExpense(groupId, expenseId) {
  const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
  await deleteDoc(expenseRef);
}

/**
 * Settles debts in a group by clearing or balancing expenses
 */
export async function settleAllDebts(groupId) {
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const expensesSnap = await getDocs(expensesRef);
  
  const batch = writeBatch(db);
  expensesSnap.forEach((expDoc) => {
    batch.delete(expDoc.ref);
  });
  
  await batch.commit();
}
