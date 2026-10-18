import type { Restaurant } from './interfaces/Restaurant';

const restaurantCard = (
  restaurant: Restaurant,
  onSelect: (restaurant: Restaurant) => void,
  isFavorite = false,
  onToggleFavorite?: (restaurant: Restaurant) => void,
): HTMLElement => {
  const { name, city, address, company } = restaurant;

  const restaurantItem = document.createElement('article');
  restaurantItem.className = 'restaurant-card';
  restaurantItem.tabIndex = 0;
  restaurantItem.setAttribute('role', 'button');
  restaurantItem.setAttribute(
    'aria-label',
    `Valitse ravintola ${name}`,
  );

  const restaurantName = document.createElement('h3');
  restaurantName.textContent = name;

  const restaurantCity = document.createElement('p');
  restaurantCity.textContent = city;

  const restaurantAddress = document.createElement('p');
  restaurantAddress.textContent = address;

  const restaurantCompany = document.createElement('p');
  restaurantCompany.textContent = company;

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'favorite-button';
  favoriteButton.textContent = isFavorite
    ? '♥ Suosikki'
    : '♡ Lisää suosikiksi';
  favoriteButton.setAttribute(
    'aria-label',
    isFavorite
      ? `Poista ${name} suosikeista`
      : `Lisää ${name} suosikiksi`,
  );
  favoriteButton.setAttribute('aria-pressed', String(isFavorite));

  if (isFavorite) {
    favoriteButton.classList.add('is-favorite');
  }

  favoriteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggleFavorite?.(restaurant);
  });

  favoriteButton.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });

  restaurantItem.append(
    restaurantName,
    restaurantCity,
    restaurantAddress,
    restaurantCompany,
    favoriteButton,
  );

  restaurantItem.addEventListener('click', () => {
    onSelect(restaurant);
  });

  restaurantItem.addEventListener('keydown', (event) => {
    if (
      event.target === restaurantItem &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      onSelect(restaurant);
    }
  });

  return restaurantItem;
};

export { restaurantCard };