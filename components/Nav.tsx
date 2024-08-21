import Link from 'next/link';

const Nav = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <ul className="flex space-x-4">
        <li>
          <Link href="/" className="text-white hover:text-gray-300">
            Matches
          </Link>
        </li>
        <li>
          <Link href="/standings" className="text-white hover:text-gray-300">
            Standings
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Nav;
