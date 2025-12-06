import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Plus, X, LogOut, Activity, Search, 
  DollarSign, BarChart3, Briefcase, Star, Eye, Wallet, ArrowRightLeft, 
  AlertCircle, CheckCircle 
} from 'lucide-react';

// --- Constants & Config ---
const SUPPORTED_STOCKS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA', 'BTC', 'ETH'];

const STOCK_INFO = {
  GOOG: { name: 'Alphabet Inc.', sector: 'Technology', exchange: 'NASDAQ' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Automotive', exchange: 'NASDAQ' },
  AMZN: { name: 'Amazon.com Inc.', sector: 'E-commerce', exchange: 'NASDAQ' },
  META: { name: 'Meta Platforms Inc.', sector: 'Technology', exchange: 'NASDAQ' },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Semiconductors', exchange: 'NASDAQ' },
  BTC: { name: 'Bitcoin', sector: 'Crypto', exchange: 'CRYPTO' },
  ETH: { name: 'Ethereum', sector: 'Crypto', exchange: 'CRYPTO' }
};

const INITIAL_PRICES = {
  GOOG: 142.50, TSLA: 245.80, AMZN: 178.30, META: 485.20,
  NVDA: 875.40, BTC: 64200.00, ETH: 3450.00
};

// --- COMPONENT: Pro Chart (Unchanged) ---
const ProStockChart = ({ data, height = 300 }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hoverData, setHoverData] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const config = useMemo(() => ({
    padding: { top: 20, bottom: 30, left: 10, right: 60 },
    volHeight: 50, 
  }), []);

  const { minPrice, maxPrice, maxVol, candleWidth, chartHeight } = useMemo(() => {
    if (!data || data.length === 0) return { minPrice: 0, maxPrice: 100, candleWidth: 0, chartHeight: 0 };

    const allPrices = data.flatMap(d => [d.low, d.high]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const maxV = Math.max(...data.map(d => d.volume || 0));
    
    const cHeight = height - config.padding.top - config.padding.bottom;

    return {
      minPrice: min - (max - min) * 0.1, 
      maxPrice: max + (max - min) * 0.1,
      maxVol: maxV,
      chartHeight: cHeight,
      candleWidth: (width - config.padding.left - config.padding.right) / data.length
    };
  }, [data, width, height, config]);

  const scaleY = (price) => {
    const range = maxPrice - minPrice;
    if (range === 0) return chartHeight / 2;
    return chartHeight - ((price - minPrice) / range) * chartHeight;
  };

  const scaleVol = (vol) => {
    if (maxVol === 0) return 0;
    return (vol / maxVol) * config.volHeight;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.floor((x - config.padding.left) / candleWidth);
    
    if (index >= 0 && index < data.length) {
      setHoverData(data[index]);
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => setHoverData(null);

  const renderGrid = () => {
    const lines = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = (chartHeight / steps) * i + config.padding.top;
      const price = maxPrice - ((maxPrice - minPrice) / steps) * i;
      lines.push(
        <g key={`grid-${i}`}>
          <line x1={config.padding.left} y1={y} x2={width - config.padding.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4" opacity="0.2" />
          <text x={width - 55} y={y + 3} fill="#64748b" fontSize="10" fontFamily="monospace">${price.toFixed(2)}</text>
        </g>
      );
    }
    return lines;
  };

  const renderVolume = () => {
    return data.map((d, i) => {
      const x = config.padding.left + (i * candleWidth);
      const h = scaleVol(d.volume || 0);
      const y = config.padding.top + chartHeight - h;
      const color = d.isUp ? "#10b981" : "#ef4444";
      return <rect key={`vol-${i}`} x={x + 1} y={y} width={Math.max(1, candleWidth - 2)} height={h} fill={color} opacity="0.3" />;
    });
  };

  const renderSMA = (period = 20) => {
    if (data.length < period) return null;
    let path = "";
    for (let i = period; i < data.length; i++) {
      const sum = data.slice(i - period, i).reduce((acc, val) => acc + val.close, 0);
      const avg = sum / period;
      const x = config.padding.left + (i * candleWidth) + (candleWidth / 2);
      const y = scaleY(avg) + config.padding.top;
      path += `${i === period ? "M" : "L"} ${x} ${y} `;
    }
    return <path d={path} stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.8" />;
  };

  const renderCandles = () => {
    return data.map((d, i) => {
      const x = config.padding.left + (i * candleWidth);
      const wickX = x + candleWidth / 2;
      const yHigh = scaleY(d.high) + config.padding.top;
      const yLow = scaleY(d.low) + config.padding.top;
      const yOpen = scaleY(d.open) + config.padding.top;
      const yClose = scaleY(d.close) + config.padding.top;
      const color = d.isUp ? "#10b981" : "#ef4444";

      return (
        <g key={d.id || i}>
          <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={color} strokeWidth="1" />
          <rect x={x + 1} y={Math.min(yOpen, yClose)} width={Math.max(1, candleWidth - 2)} height={Math.max(1, Math.abs(yOpen - yClose))} fill={color} />
        </g>
      );
    });
  };

  const renderCrosshair = () => {
    if (!hoverData) return null;
    const x = config.padding.left + (data.indexOf(hoverData) * candleWidth) + (candleWidth / 2);
    const y = scaleY(hoverData.close) + config.padding.top;
    
    return (
      <g pointerEvents="none">
        <line x1={x} y1={config.padding.top} x2={x} y2={height - config.padding.bottom} stroke="white" strokeDasharray="3 3" opacity="0.5" />
        <line x1={config.padding.left} y1={y} x2={width - config.padding.right} y2={y} stroke="white" strokeDasharray="3 3" opacity="0.5" />
        
        <rect x={10} y={10} width="240" height="60" fill="#0f172a" stroke="#334155" rx="4" opacity="0.95"/>
        <text x={20} y={30} fill="#94a3b8" fontSize="11" fontFamily="monospace">
           O: <tspan fill="white">{hoverData.open.toFixed(2)}</tspan> H: <tspan fill="white">{hoverData.high.toFixed(2)}</tspan>
        </text>
        <text x={20} y={45} fill="#94a3b8" fontSize="11" fontFamily="monospace">
           L: <tspan fill="white">{hoverData.low.toFixed(2)}</tspan> C: <tspan fill="white">{hoverData.close.toFixed(2)}</tspan>
        </text>
        <text x={20} y={60} fill="#94a3b8" fontSize="11" fontFamily="monospace">
           Vol: <tspan fill="white">{hoverData.volume}</tspan>
        </text>
      </g>
    );
  };

  return (
    <div ref={containerRef} className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner relative select-none">
      <svg 
        width="100%" height={height} 
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        className="bg-gradient-to-b from-slate-900 to-slate-950 cursor-crosshair"
      >
        {data && data.length > 0 && (
          <>
            {renderGrid()}
            {renderVolume()}
            {renderSMA(20)}
            {renderCandles()}
            {renderCrosshair()}
          </>
        )}
      </svg>
      <div className="absolute top-2 right-16 flex gap-3 text-[10px] font-mono">
        <span className="text-yellow-500 flex items-center">● SMA(20)</span>
        <span className="text-slate-500 flex items-center">▮ Volume</span>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
const StockDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(''); // NEW: Error state
  
  const [loading, setLoading] = useState(true);
  
  // Market Data State
  const [stockPrices, setStockPrices] = useState(INITIAL_PRICES);
  const [candleHistory, setCandleHistory] = useState({});
  const idCounters = useRef({});
  const [dayStats, setDayStats] = useState({});

  // User Portfolio State
  const [subscribedStocks, setSubscribedStocks] = useState([]);
  const [balance, setBalance] = useState(100000); 
  const [holdings, setHoldings] = useState({}); 
  const [tradeInputs, setTradeInputs] = useState({}); 

  // --- Login Logic ---
  const validateEmail = (email) => {
    // Basic Regex for Email Validation
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // 1. Check if empty
    if (!email.trim()) {
        setEmailError('Email address is required.');
        return;
    }
    // 2. Check Validity
    if (!validateEmail(email)) {
        setEmailError('Please enter a valid email address (e.g., user@example.com).');
        return;
    }
    // 3. Success
    setEmailError('');
    setCurrentUser(email.toLowerCase());
  };

  // --- 1. Load User Data ---
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) { setLoading(false); return; }
      try {
        if (window.storage) {
          const result = await window.storage.get(`user:${currentUser}`);
          if (result) {
            const data = JSON.parse(result.value);
            setSubscribedStocks(data.subscriptions || []);
            setBalance(data.balance || 100000);
            setHoldings(data.holdings || {});
          }
        }
      } catch (e) {
        setSubscribedStocks([]);
        setBalance(100000);
        setHoldings({});
      }
      setLoading(false);
    };
    loadUserData();
  }, [currentUser]);

  const saveUserData = useCallback(async (subs, bal, holds) => {
    if (!currentUser || !window.storage) return;
    try {
      await window.storage.set(`user:${currentUser}`, JSON.stringify({ 
        subscriptions: subs,
        balance: bal,
        holdings: holds
      }));
    } catch (e) { console.error(e); }
  }, [currentUser]);

  // --- 2. Market Simulation (Ticker) ---
  useEffect(() => {
    if (Object.keys(dayStats).length === 0) {
      const stats = {};
      Object.keys(INITIAL_PRICES).forEach(t => {
        stats[t] = { open: INITIAL_PRICES[t], high: INITIAL_PRICES[t], low: INITIAL_PRICES[t], vol: Math.floor(Math.random()*1000000) };
      });
      setDayStats(stats);
    }

    const interval = setInterval(() => {
      setStockPrices(prev => {
        const nextPrices = { ...prev };
        const nextCandles = { ...candleHistory };
        const nextStats = { ...dayStats };

        Object.keys(prev).forEach(ticker => {
          const price = prev[ticker];
          const volatility = price * 0.0015; 
          const change = (Math.random() - 0.5) * volatility * 2;
          const newPrice = Math.max(0.01, price + change);
          
          nextPrices[ticker] = newPrice;

          if (nextStats[ticker]) {
            nextStats[ticker].high = Math.max(nextStats[ticker].high, newPrice);
            nextStats[ticker].low = Math.min(nextStats[ticker].low, newPrice);
            nextStats[ticker].vol += Math.floor(Math.random() * 500);
          }

          if (!nextCandles[ticker]) {
            nextCandles[ticker] = [];
            idCounters.current[ticker] = 0;
            for(let i=0; i<40; i++) {
               nextCandles[ticker].push({
                   id: idCounters.current[ticker]++,
                   open: newPrice, close: newPrice, high: newPrice, low: newPrice, isUp: true, volume: 1000
               });
            }
          }
          
          const history = [...nextCandles[ticker]];
          const last = history[history.length - 1];
          const open = last ? last.close : newPrice;
          const close = newPrice;
          const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
          const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
          const volume = Math.floor(Math.random() * 5000) + 500;

          history.push({
            id: idCounters.current[ticker]++,
            open, close, high, low, volume,
            isUp: close >= open
          });

          if (history.length > 60) history.shift();
          nextCandles[ticker] = history;
        });

        setCandleHistory(nextCandles);
        setDayStats(nextStats);
        return nextPrices;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [candleHistory, dayStats]);

  // --- 3. Trading Logic ---
  const handleTradeInput = (ticker, value) => {
    setTradeInputs(prev => ({ ...prev, [ticker]: value }));
  };

  const executeBuy = (ticker) => {
    const qty = parseFloat(tradeInputs[ticker]);
    const price = stockPrices[ticker];
    if (!qty || qty <= 0) return alert("Invalid quantity");
    
    const cost = qty * price;
    if (cost > balance) return alert("Insufficient funds!");

    const newBalance = balance - cost;
    const currentHolding = holdings[ticker] || { qty: 0, avgPrice: 0 };
    const totalCost = (currentHolding.qty * currentHolding.avgPrice) + cost;
    const newQty = currentHolding.qty + qty;
    const newAvg = totalCost / newQty;

    const newHoldings = { ...holdings, [ticker]: { qty: newQty, avgPrice: newAvg } };

    setBalance(newBalance);
    setHoldings(newHoldings);
    setTradeInputs(prev => ({ ...prev, [ticker]: "" }));
    saveUserData(subscribedStocks, newBalance, newHoldings);
    
    if (!subscribedStocks.includes(ticker)) {
        const newSubs = [...subscribedStocks, ticker];
        setSubscribedStocks(newSubs);
        saveUserData(newSubs, newBalance, newHoldings);
    }
  };

  const executeSell = (ticker) => {
    const qty = parseFloat(tradeInputs[ticker]);
    const price = stockPrices[ticker];
    if (!qty || qty <= 0) return alert("Invalid quantity");

    const currentHolding = holdings[ticker];
    if (!currentHolding || currentHolding.qty < qty) return alert("Insufficient shares!");

    const revenue = qty * price;
    const newBalance = balance + revenue;
    const newQty = currentHolding.qty - qty;
    
    let newHoldings = { ...holdings };
    if (newQty <= 0) {
        delete newHoldings[ticker];
    } else {
        newHoldings[ticker] = { ...currentHolding, qty: newQty };
    }

    setBalance(newBalance);
    setHoldings(newHoldings);
    setTradeInputs(prev => ({ ...prev, [ticker]: "" }));
    saveUserData(subscribedStocks, newBalance, newHoldings);
  };

  const getEquity = () => {
    return Object.keys(holdings).reduce((sum, ticker) => {
      return sum + (holdings[ticker].qty * stockPrices[ticker]);
    }, 0);
  };
  
  const getTickerChange = (ticker) => {
    const open = dayStats[ticker]?.open || stockPrices[ticker];
    return ((stockPrices[ticker] - open) / open) * 100;
  };

  const toggleSubscription = (ticker) => {
    let newSubs;
    if (subscribedStocks.includes(ticker)) {
      newSubs = subscribedStocks.filter(s => s !== ticker);
    } else {
      newSubs = [...subscribedStocks, ticker];
    }
    setSubscribedStocks(newSubs);
    saveUserData(newSubs, balance, holdings);
  };

  // --- RENDER ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black z-0" />
        <div className="relative z-10 bg-slate-900/80 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
               <BarChart3 className="text-white w-7 h-7"/>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">TradeMax Pro</h1>
            <p className="text-slate-400">Institutional Grade Dashboard</p>
          </div>
          
          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 ml-1">ACCESS EMAIL ID</label>
              <input 
                type="text" 
                value={email} 
                onChange={(e) => {
                    setEmail(e.target.value);
                    if(emailError) setEmailError(''); // Clear error on type
                }}
                className={`w-full px-4 py-3 bg-slate-950 border rounded-lg text-white placeholder-slate-600 outline-none transition-all ${
                    emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
                placeholder="trader@firm.com" 
              />
              {/* Error Message */}
              {emailError && (
                <div className="flex items-center gap-2 mt-2 text-red-500 text-sm animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    <span>{emailError}</span>
                </div>
              )}
            </div>
            
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              Launch Terminal
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Secure Encrypted Connection • v2.4.0
          </div>
        </div>
      </div>
    );
  }

  const totalValue = balance + getEquity();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><BarChart3 className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold">TradeMax Pro</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
                 <div className="text-xs text-gray-500">Portfolio Value</div>
                 <div className="text-lg font-bold text-gray-900">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
             </div>
             <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
             <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline">{currentUser}</span>
             </div>
             <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 ml-2">
               <LogOut className="w-4 h-4" /> 
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-gray-500 text-sm mb-1 flex items-center gap-2"><Wallet className="w-4 h-4"/> Buying Power (Cash)</div>
                <div className="text-3xl font-bold text-gray-900">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-gray-500 text-sm mb-1 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Invested Equity</div>
                <div className="text-3xl font-bold text-blue-600">${getEquity().toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <div className="text-gray-500 text-sm mb-1 flex items-center gap-2"><Activity className="w-4 h-4"/> Open Positions</div>
                 <div className="text-3xl font-bold text-gray-900">{Object.keys(holdings).length}</div>
            </div>
        </div>

        {/* Holdings Table */}
        {Object.keys(holdings).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-bold text-gray-800">Your Positions</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Ticker</th>
                                <th className="px-6 py-3">Qty</th>
                                <th className="px-6 py-3">Avg Price</th>
                                <th className="px-6 py-3">Current Price</th>
                                <th className="px-6 py-3">Market Value</th>
                                <th className="px-6 py-3">Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {Object.keys(holdings).map(ticker => {
                                const h = holdings[ticker];
                                const current = stockPrices[ticker];
                                const mktValue = h.qty * current;
                                const pl = mktValue - (h.qty * h.avgPrice);
                                const plPct = (pl / (h.qty * h.avgPrice)) * 100;
                                return (
                                    <tr key={ticker} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-bold">{ticker}</td>
                                        <td className="px-6 py-3">{h.qty}</td>
                                        <td className="px-6 py-3">${h.avgPrice.toFixed(2)}</td>
                                        <td className="px-6 py-3">${current.toFixed(2)}</td>
                                        <td className="px-6 py-3 font-medium">${mktValue.toFixed(2)}</td>
                                        <td className={`px-6 py-3 font-bold ${pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPct.toFixed(2)}%)
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Stock List / Market */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Market Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
            {SUPPORTED_STOCKS.map(ticker => {
                const isSub = subscribedStocks.includes(ticker);
                const change = getTickerChange(ticker);
                return (
                    <button key={ticker} onClick={() => toggleSubscription(ticker)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                           isSub ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm">{ticker}</span>
                            {isSub ? <Eye className="w-3 h-3 text-blue-600"/> : <Plus className="w-3 h-3 text-gray-400"/>}
                        </div>
                        <div className="text-sm font-bold">${stockPrices[ticker]?.toFixed(2)}</div>
                        <div className={`text-xs ${change>=0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {change>=0?'+':''}{change.toFixed(2)}%
                        </div>
                    </button>
                )
            })}
        </div>

        {/* Active Watchlist & Charts */}
        {subscribedStocks.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {subscribedStocks.map(ticker => {
                    const change = getTickerChange(ticker);
                    const isPositive = change >= 0;
                    return (
                        <div key={ticker} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                            {/* Card Header */}
                            <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold flex items-center gap-2">
                                        {ticker} 
                                        <span className={`text-sm px-2 py-0.5 rounded ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {isPositive?'+':''}{change.toFixed(2)}%
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-500">{STOCK_INFO[ticker].name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-mono font-bold">${stockPrices[ticker].toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-slate-900 p-2">
                                <ProStockChart data={candleHistory[ticker]} height={280} />
                            </div>

                            {/* Trading Panel */}
                            <div className="p-5 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quantity</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={tradeInputs[ticker] || ''}
                                            onChange={(e) => handleTradeInput(ticker, e.target.value)}
                                            placeholder="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => executeBuy(ticker)}
                                        className="flex-1 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4"/> Buy
                                    </button>
                                    <button 
                                        onClick={() => executeSell(ticker)}
                                        className="flex-1 w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                                    >
                                        <ArrowRightLeft className="w-4 h-4"/> Sell
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-gray-500 flex justify-between">
                                    <span>Est. Cost: ${((parseFloat(tradeInputs[ticker])||0) * stockPrices[ticker]).toFixed(2)}</span>
                                    <span>Owned: {holdings[ticker]?.qty || 0} shares</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-20 text-gray-400">
                <Star className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                <p>Select stocks from the market overview to start trading</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StockDashboard;