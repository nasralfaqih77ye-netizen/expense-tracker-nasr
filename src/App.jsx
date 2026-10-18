
import { useState, useEffect } from "react";
import "./App.css";

import { db, authReady } from "./firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { Pie } from "react-chartjs-2";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("Food");
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Load only the signed-in user's transactions from Firebase
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    async function loadExpenses() {
      try {
        const userCredential = await authReady;

        if (cancelled) return;

        const currentUser = userCredential.user;

        const expensesQuery = query(
          collection(db, "expenses"),
          where("userId", "==", currentUser.uid)
        );

        unsubscribe = onSnapshot(
          expensesQuery,
          (snapshot) => {
            const savedExpenses = snapshot.docs.map((document) => ({
              ...document.data(),
              id: document.id,
            }));

            setExpenses(savedExpenses);
          },
          (error) => {
            console.error("Error loading expenses:", error);
            alert("Could not load transactions. Please check Firebase.");
          }
        );
      } catch (error) {
        console.error("Authentication error:", error);
        alert("Could not connect to Firebase Authentication.");
      }
    }

    loadExpenses();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Search and category filter
  const filteredExpenses = expenses.filter((item) => {
    const matchesCategory =
      filterCategory === "All" ||
      (item.category || "Other") === filterCategory;

    const matchesSearch = (item.title || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Calculate income and expenses
  const totalExpenses = expenses
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalIncome = expenses
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = totalIncome - totalExpenses;

  // Group expenses by category for the pie chart
  const categoryTotals = expenses
    .filter((item) => item.type === "Expense")
    .reduce((totals, item) => {
      const categoryName = item.category || "Other";

      totals[categoryName] =
        (totals[categoryName] || 0) + Number(item.amount || 0);

      return totals;
    }, {});

  const chartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        label: "Expenses",
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#2563eb",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#64748b",
        ],
        borderWidth: 2,
      },
    ],
  };

  // Add a transaction to Firebase
  async function addTransaction(event) {
    event.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert("Please enter a title and a valid amount.");
      return;
    }

    try {
      const userCredential = await authReady;
      const currentUser = userCredential.user;

      const newTransaction = {
        title: title.trim(),
        amount: Number(amount),
        type,
        category,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "expenses"), newTransaction);

      setTitle("");
      setAmount("");
      setType("Expense");
      setCategory("Food");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Could not save the transaction. Please try again.");
    }
  }

  // Delete a transaction from Firebase
  async function deleteTransaction(id) {
    try {
      await authReady;
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Could not delete the transaction. Please try again.");
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Expense Tracker</h1>
          <p className="subtitle">
            Track your money. Build better habits.
          </p>
        </div>

        <span className="logo">₹</span>
      </header>

      <section className="summary">
        <article className="summary-card balance">
          <p>Current Balance</p>
          <h2>₹{balance.toFixed(2)}</h2>
        </article>

        <article className="summary-card">
          <p>Total Income</p>
          <h2 className="income">
            ₹{totalIncome.toFixed(2)}
          </h2>
        </article>

        <article className="summary-card">
          <p>Total Expenses</p>
          <h2 className="expense">
            ₹{totalExpenses.toFixed(2)}
          </h2>
        </article>
      </section>

      <section className="chart-card">
        <h2>Expenses by Category</h2>

        {Object.keys(categoryTotals).length === 0 ? (
          <p>No expenses to display yet.</p>
        ) : (
          <div className="chart-container">
            <Pie data={chartData} />
          </div>
        )}
      </section>

      <section className="content">
        <form
          className="transaction-form"
          onSubmit={addTransaction}
        >
          <h2>Add Transaction</h2>

          <label htmlFor="title">Description</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Lunch, Salary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Education">Education</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Other">Other</option>
          </select>

          <label htmlFor="type">Transaction Type</label>
          <select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>

          <button type="submit">+ Add Transaction</button>
        </form>

        <section className="transactions">
          <h2>Recent Transactions</h2>

          <div className="transaction-filters">
            <div className="filter-group">
              <label htmlFor="searchTransactions">
                Search Transactions
              </label>
              <input
                id="searchTransactions"
                type="text"
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filterCategory">
                Filter by Category
              </label>
              <select
                id="filterCategory"
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(event.target.value)
                }
              >
                <option value="All">All Categories</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Education">Education</option>
                <option value="Shopping">Shopping</option>
                <option value="Bills">Bills</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <span>₹</span>
              <p>No transactions yet.</p>
              <p>Add your first income or expense!</p>
            </div>
          ) : (
            <ul>
              {filteredExpenses.map((item) => (
                <li className="transaction" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.type} · {item.category || "Other"}
                    </p>
                  </div>

                  <div className="transaction-right">
                    <strong
                      className={
                        item.type === "Income"
                          ? "income"
                          : "expense"
                      }
                    >
                      {item.type === "Income" ? "+" : "-"}₹
                      {Number(item.amount).toFixed(2)}
                    </strong>

                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => deleteTransaction(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <footer>Expense Tracker · Built with React</footer>
    </main>
  );
}

export default App;
