import TransportDealerHeader from './TransportDealerHeader';
import TransportDealerBottomNav from './TransportDealerBottomNav';
import './styles/TransportDealerGlobal.css';

const TransportDealerLayout = ({ children }) => {
  return (
    <div className="transport-dealer-layout">
      <TransportDealerHeader />
      <main>
        {children}
      </main>
      <TransportDealerBottomNav />
    </div>
  );
};

export default TransportDealerLayout;
