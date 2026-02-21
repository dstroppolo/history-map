import type { Event } from '@/types/event'

/** Dummy events by year for 1770–1780 */
export const dummyEventsByYear: Record<number, Event[]> = {
  1770: [
    { id: 'e70-1', title: 'Boston Massacre', description: 'British soldiers fire on a crowd in Boston, killing five colonists and inflaming anti-British sentiment.', date: '1770-03-05', category: 'Politics', location: 'Boston' },
    { id: 'e70-2', title: 'James Cook lands at Botany Bay', description: 'Captain Cook claims the eastern coast of Australia for Britain.', date: '1770-04-29', category: 'Discovery', location: 'Australia' },
    { id: 'e70-3', title: 'Ludwig van Beethoven born', description: 'German composer and pianist, one of the most admired figures in Western music.', date: '1770-12-16', category: 'Culture', location: 'Bonn' },
  ],
  1771: [
    { id: 'e71-1', title: 'Richard Arkwright opens Cromford Mill', description: 'The first water-powered cotton spinning mill, a key development in the Industrial Revolution.', date: '1771-12-20', category: 'Science', location: 'Derbyshire' },
    { id: 'e71-2', title: 'Tobago ceded to France', description: 'Britain cedes Tobago to France under the Treaty of Paris.', date: '1771-06-01', category: 'Politics', location: 'Tobago' },
  ],
  1772: [
    { id: 'e72-1', title: 'First Partition of Poland', description: 'Russia, Prussia, and Austria annex large portions of Polish territory.', date: '1772-08-05', category: 'Politics', location: 'Poland' },
    { id: 'e72-2', title: 'Gaspar de Portolà dies', description: 'Spanish explorer and first Governor of the Californias.', date: '1772-10-10', category: 'Discovery', location: 'Mexico' },
  ],
  1773: [
    { id: 'e73-1', title: 'Boston Tea Party', description: 'Colonists dump 342 chests of British tea into Boston Harbor to protest taxation.', date: '1773-12-16', category: 'Politics', location: 'Boston' },
    { id: 'e73-2', title: 'Regulating Act passed', description: 'British Parliament passes the Regulating Act to overhaul the East India Company.', date: '1773-06-10', category: 'Politics', location: 'London' },
  ],
  1774: [
    { id: 'e74-1', title: 'Louis XVI becomes King of France', description: 'Louis XVI ascends to the throne at age 19.', date: '1774-05-10', category: 'Politics', location: 'Versailles' },
    { id: 'e74-2', title: 'First Continental Congress convenes', description: 'Delegates from twelve colonies meet in Philadelphia to respond to the Intolerable Acts.', date: '1774-09-05', category: 'Politics', location: 'Philadelphia' },
    { id: 'e74-3', title: 'Joseph Priestley discovers oxygen', description: 'English chemist isolates "dephlogisticated air" (oxygen).', date: '1774-08-01', category: 'Science', location: 'Wiltshire' },
  ],
  1775: [
    { id: 'e75-1', title: 'Battles of Lexington and Concord', description: 'First military engagements of the American Revolutionary War.', date: '1775-04-19', category: 'War', location: 'Massachusetts' },
    { id: 'e75-2', title: 'Second Continental Congress', description: 'Congress establishes the Continental Army with George Washington as commander-in-chief.', date: '1775-05-10', category: 'Politics', location: 'Philadelphia' },
    { id: 'e75-3', title: 'Jane Austen born', description: 'English novelist known for Pride and Prejudice and Sense and Sensibility.', date: '1775-12-16', category: 'Culture', location: 'Hampshire' },
  ],
  1776: [
    { id: 'e76-1', title: 'American Declaration of Independence', description: 'The Continental Congress adopts the Declaration of Independence, declaring the thirteen American colonies as independent states.', date: '1776-07-04', category: 'Politics', location: 'Philadelphia' },
    { id: 'e76-2', title: 'The Wealth of Nations published', description: 'Adam Smith publishes "An Inquiry into the Nature and Causes of the Wealth of Nations", foundational work in economics.', date: '1776-03-09', category: 'Culture', location: 'London' },
    { id: 'e76-3', title: "James Cook's third voyage begins", description: 'Captain James Cook sets sail on his third and final voyage, seeking the Northwest Passage.', date: '1776-07-12', category: 'Discovery', location: 'Plymouth' },
    { id: 'e76-4', title: 'Battle of Long Island', description: 'British forces defeat the Continental Army in the first major battle of the American Revolutionary War.', date: '1776-08-27', category: 'War', location: 'Brooklyn' },
    { id: 'e76-5', title: 'Common Sense published', description: "Thomas Paine's pamphlet argues for American independence from British rule.", date: '1776-01-10', category: 'Politics', location: 'Philadelphia' },
  ],
  1777: [
    { id: 'e77-1', title: 'Battle of Saratoga', description: 'American victory that convinces France to enter the war on the side of the colonies.', date: '1777-10-17', category: 'War', location: 'New York' },
    { id: 'e77-2', title: 'Stars and Stripes adopted', description: 'Continental Congress adopts the first official flag of the United States.', date: '1777-06-14', category: 'Politics', location: 'Philadelphia' },
    { id: 'e77-3', title: 'Articles of Confederation adopted', description: 'First constitution of the United States, creating a loose confederation of states.', date: '1777-11-15', category: 'Politics', location: 'York' },
  ],
  1778: [
    { id: 'e78-1', title: 'France enters the Revolutionary War', description: 'France signs treaties of alliance and commerce with the United States.', date: '1778-02-06', category: 'Politics', location: 'Paris' },
    { id: 'e78-2', title: 'James Cook discovers Hawaii', description: 'Cook lands on the Hawaiian Islands, which he names the Sandwich Islands.', date: '1778-01-18', category: 'Discovery', location: 'Hawaii' },
    { id: 'e78-3', title: 'Voltaire dies', description: 'French Enlightenment writer, historian, and philosopher.', date: '1778-05-30', category: 'Culture', location: 'Paris' },
  ],
  1779: [
    { id: 'e79-1', title: 'James Cook killed in Hawaii', description: 'Cook is killed during a dispute with Hawaiians at Kealakekua Bay.', date: '1779-02-14', category: 'Discovery', location: 'Hawaii' },
    { id: 'e79-2', title: 'Spain joins the Revolutionary War', description: 'Spain declares war on Britain, supporting the American colonies.', date: '1779-06-21', category: 'War', location: 'Madrid' },
  ],
  1780: [
    { id: 'e80-1', title: 'Gordon Riots in London', description: 'Anti-Catholic riots erupt in London, the most destructive in the city\'s history.', date: '1780-06-02', category: 'Politics', location: 'London' },
    { id: 'e80-2', title: 'Benedict Arnold\'s treason discovered', description: 'Arnold\'s plot to surrender West Point to the British is exposed.', date: '1780-09-25', category: 'War', location: 'West Point' },
    { id: 'e80-3', title: 'Royal Society of Edinburgh founded', description: 'Scotland\'s national academy of science and letters is established.', date: '1780-06-23', category: 'Science', location: 'Edinburgh' },
  ],
}

export const dummyOnThisDay: Event[] = [
  {
    id: 'otd1',
    title: 'Galileo Galilei born',
    description: 'Italian astronomer, physicist and engineer who played a major role in the scientific revolution.',
    date: '1564-02-15',
    category: 'Science',
    location: 'Pisa',
  },
  {
    id: 'otd2',
    title: 'Susan B. Anthony born',
    description: 'American social reformer and women\'s rights activist who played a pivotal role in the women\'s suffrage movement.',
    date: '1820-02-15',
    category: 'Politics',
    location: 'Massachusetts',
  },
]
