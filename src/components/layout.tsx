
import { Outlet } from 'react-router-dom';
import Sidevbar from './sidevbar';  // ✅ Correcto para export default
import { useState } from 'react';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className=" flex w-screen h-screen bg-gray-50">
        <Sidevbar collapsed={collapsed} setCollapsed={setCollapsed} />

        <main className="flex-1 flex flex-col  overflow-hidden">
            <Outlet  />
            </main>
    </div>
    )
}
export default Layout;