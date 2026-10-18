import './style.css';
import { restaurantCard } from './components';
import { fetchData } from './functions';
import type { Restaurant } from './interfaces/Restaurant';
import type { LoginUser, User, UpdateUser } from './interfaces/User';
import type { UploadResult } from './interfaces/UploadResult';
import { apiUrl, uploadUrl } from './variables';

interface Course {
  name?: string;
  price?: string;
  diets?: string[] | string;
}

interface DailyMenu {
  courses?: Course[];
}

interface WeeklyMenuDay {
  date?: string;
  courses?: Course[];
}

interface WeeklyMenu {
  days?: WeeklyMenuDay[];
}

interface UsernameAvailability {
  available: boolean;
}

const getElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Elementtiä ei löytynyt: ${selector}`);
  }

  return element;
};

// Dialogin elementit
const accountDialog = getElement<HTMLDialogElement>('#account-dialog');
const accountButton = getElement<HTMLButtonElement>('#account-button');
const accountButtonLabel = getElement<HTMLElement>('#account-button-label');
const headerAvatar = getElement<HTMLImageElement>('#header-avatar');
const closeDialogButton = getElement<HTMLButtonElement>('#close-dialog');
const dialogTitle = getElement<HTMLElement>('#dialog-title');
const accountForms = getElement<HTMLElement>('.account-forms');
const profilePanel = getElement<HTMLElement>('.profile-panel');
const favoriteContent = getElement<HTMLElement>(
  '#favorite-restaurant-content',
);

// Ravintolanäkymän elementit
const restaurantList = getElement<HTMLElement>('#restaurant-list');
const cityFilter = getElement<HTMLSelectElement>('#city-filter');
const providerFilter = getElement<HTMLSelectElement>('#provider-filter');
const selectedRestaurantText = getElement<HTMLElement>('#selected-restaurant');
const menuMessage = getElement<HTMLElement>('#menu-message');
const menuContent = getElement<HTMLElement>('#menu-content');

const dailyMenuButton = getElement<HTMLButtonElement>('#daily-menu');
const weeklyMenuButton = getElement<HTMLButtonElement>('#weekly-menu');

// Käyttäjätilin lomakkeet
const registerForm = getElement<HTMLFormElement>('#register-form');
const loginForm = getElement<HTMLFormElement>('#login-form');
const profileForm = getElement<HTMLFormElement>('#profile-form');
const avatarForm = getElement<HTMLFormElement>('#avatar-form');

// Viestien näyttöalueet
const registerMessage = getElement<HTMLElement>('#register-message');
const loginMessage = getElement<HTMLElement>('#login-message');
const profileMessage = getElement<HTMLElement>('#profile-message');
const avatarMessage = getElement<HTMLElement>('#avatar-message');

// Profiilin kentät
const profileUsername = getElement<HTMLInputElement>('#profile-username');
const profileEmail = getElement<HTMLInputElement>('#profile-email');

const logoutButton = getElement<HTMLButtonElement>('#logout-button');
const deleteAccountButton =
  getElement<HTMLButtonElement>('#delete-account-button');

// Profiilikuvan kentät
const avatarInput = getElement<HTMLInputElement>('#avatar');
const avatarTarget = getElement<HTMLImageElement>('#avatar-target');

// Sovelluksen tila
let restaurants: Restaurant[] = [];
let selectedRestaurant: Restaurant | null = null;
let loggedIn = false;
let favoriteRestaurantId: string | null = null;

// Näyttää viestin halutussa elementissä
const showMessage = (target: HTMLElement, message: string): void => {
  target.textContent = message;
};

// Muuttaa ruokavaliot tulostettavaksi tekstiksi
const formatDiets = (diets: Course['diets']): string => {
  if (Array.isArray(diets)) {
    return diets.join(', ');
  }

  if (typeof diets === 'string') {
    return diets;
  }

  return '';
};

// Näyttää päivämäärän suomeksi
const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

// Näyttää suosikkiravintolan profiilissa
const renderFavoriteRestaurant = (): void => {
  favoriteContent.replaceChildren();

  if (!favoriteRestaurantId) {
    favoriteContent.textContent =
      'Et ole vielä valinnut suosikkiravintolaa.';
    return;
  }

  const restaurant = restaurants.find(
    (item) => item._id === favoriteRestaurantId,
  );

  if (!restaurant) {
    favoriteContent.textContent =
      'Suosikkiravintolan tietoja haetaan...';
    return;
  }

  const name = document.createElement('h5');
  name.textContent = restaurant.name;

  const details = document.createElement('p');
  details.textContent = [
    restaurant.city,
    restaurant.address,
    restaurant.company,
  ]
    .filter(Boolean)
    .join(' · ');

  favoriteContent.append(name, details);
};

// Päivittää profiilikuvan näkyvyyden
const updateHeaderAvatar = (user: User | null): void => {
  if (loggedIn && user?.avatar) {
    headerAvatar.src = uploadUrl + user.avatar;
    headerAvatar.hidden = false;
  } else {
    headerAvatar.removeAttribute('src');
    headerAvatar.hidden = true;
  }
};

// Päivittää napin tekstin ja muut ominaisuudet kirjautumistilan mukaan
const updateAccountButton = (): void => {
  if (loggedIn) {
    accountButtonLabel.textContent = 'Oma profiili';
    accountButton.setAttribute('aria-label', 'Avaa oma profiili');
  } else {
    accountButtonLabel.textContent = 'Kirjaudu sisään / Rekisteröidy';
    accountButton.setAttribute(
      'aria-label',
      'Kirjaudu sisään tai rekisteröidy',
    );
  }
};

// Tyhjentää profiilikuvat
const clearAvatarImages = (): void => {
  headerAvatar.removeAttribute('src');
  headerAvatar.hidden = true;

  avatarTarget.removeAttribute('src');
  avatarTarget.hidden = true;
};

// Näyttää kirjautumis- ja rekisteröitymislomakkeet
const showAccountForms = (): void => {
  dialogTitle.textContent = 'Kirjaudu sisään tai rekisteröidy';
  accountForms.hidden = false;
  profilePanel.hidden = true;

  if (!accountDialog.open) {
    accountDialog.showModal();
  }
};

// Näyttää profiilin
const showProfileDialog = (): void => {
  dialogTitle.textContent = 'Oma profiili';
  accountForms.hidden = true;
  profilePanel.hidden = false;

  if (!accountDialog.open) {
    accountDialog.showModal();
  }
};

// Avaa kirjautumis- ja rekisteröitymisikkunan
accountButton.addEventListener('click', () => {
  if (loggedIn) {
    showProfileDialog();
  } else {
    showAccountForms();
  }
});

// Sulje-nappi
closeDialogButton.addEventListener('click', () => {
  accountDialog.close();
});

// Dialogin taustan painaminen sulkee ikkunan
accountDialog.addEventListener('click', (event: MouseEvent) => {
  if (event.target === accountDialog) {
    accountDialog.close();
  }
});

// Näyttää käyttäjän tiedot profiilissa
const showUserData = (user: User): void => {
  profileUsername.value = user.username;
  profileEmail.value = user.email;
  favoriteRestaurantId = user.favouriteRestaurant || null;

  if (user.avatar) {
    avatarTarget.src = uploadUrl + user.avatar;
    avatarTarget.hidden = false;
  } else {
    avatarTarget.removeAttribute('src');
    avatarTarget.hidden = true;
  }

  updateHeaderAvatar(user);
  renderFavoriteRestaurant();
};

// Hakee kirjautuneen käyttäjän tiedot
const getUserData = async (token: string): Promise<User> =>
  await fetchData<User>(`${apiUrl}/users/token`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// Tarkistaa, onko käyttäjä jo kirjautunut
const checkToken = async (): Promise<void> => {
  const token = localStorage.getItem('token');

  if (!token) {
    loggedIn = false;
    favoriteRestaurantId = null;
    clearAvatarImages();
    updateAccountButton();
    accountForms.hidden = false;
    profilePanel.hidden = true;
    renderFavoriteRestaurant();
    return;
  }

  try {
    const user = await getUserData(token);

    loggedIn = true;
    showUserData(user);
    updateAccountButton();

    accountForms.hidden = false;
    profilePanel.hidden = true;

    renderRestaurants();
    renderFavoriteRestaurant();
  } catch (error) {
    localStorage.removeItem('token');
    loggedIn = false;
    favoriteRestaurantId = null;
    clearAvatarImages();
    updateAccountButton();

    accountForms.hidden = false;
    profilePanel.hidden = true;

    console.error('Käyttäjätietojen hakeminen epäonnistui:', error);
    renderRestaurants();
    renderFavoriteRestaurant();
  }
};

// Kirjautuminen
loginForm.addEventListener('submit', async (event: SubmitEvent) => {
  event.preventDefault();
  showMessage(loginMessage, 'Kirjaudutaan sisään...');

  const usernameInput = getElement<HTMLInputElement>('#login-username');
  const passwordInput = getElement<HTMLInputElement>('#login-password');

  try {
    const credentials = {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    };

    const user = await fetchData<LoginUser>(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    localStorage.setItem('token', user.token);
    loggedIn = true;

    showUserData(user.data);
    updateAccountButton();

    loginForm.reset();
    showMessage(loginMessage, '');

    accountDialog.close();
    accountForms.hidden = false;
    profilePanel.hidden = true;

    renderRestaurants();
    renderFavoriteRestaurant();
  } catch (error) {
    console.error('Kirjautuminen epäonnistui:', error);
    showMessage(
      loginMessage,
      'Kirjautuminen epäonnistui. Tarkista käyttäjänimi ja salasana.',
    );
  }
});

// Rekisteröinti
registerForm.addEventListener('submit', async (event: SubmitEvent) => {
  event.preventDefault();

  const usernameInput = getElement<HTMLInputElement>('#register-username');
  const emailInput = getElement<HTMLInputElement>('#register-email');
  const passwordInput = getElement<HTMLInputElement>('#register-password');
  const confirmPasswordInput = getElement<HTMLInputElement>(
    '#register-password-confirm',
  );

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (password !== confirmPasswordInput.value) {
    showMessage(registerMessage, 'Salasanat eivät täsmää.');
    confirmPasswordInput.focus();
    return;
  }

  showMessage(
    registerMessage,
    'Tarkistetaan käyttäjänimen saatavuutta...',
  );

  let availability: UsernameAvailability;

  try {
    availability = await fetchData<UsernameAvailability>(
      `${apiUrl}/users/available/${encodeURIComponent(username)}`,
    );
  } catch (error) {
    console.error(
      'Käyttäjänimen saatavuuden tarkistaminen epäonnistui:',
      error,
    );

    showMessage(
      registerMessage,
      'Käyttäjänimen saatavuutta ei voitu tarkistaa. Yritä hetken kuluttua uudelleen.',
    );
    return;
  }

  if (!availability.available) {
    showMessage(
      registerMessage,
      'Käyttäjänimi on jo käytössä. Valitse toinen käyttäjänimi.',
    );
    usernameInput.focus();
    return;
  }

  showMessage(registerMessage, 'Rekisteröidään käyttäjää...');

  const newUser = {
    username,
    email,
    password,
  };

  try {
    await fetchData<unknown>(`${apiUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });

    registerForm.reset();

    showMessage(
      registerMessage,
      'Rekisteröinti onnistui. Voit nyt kirjautua sisään.',
    );
  } catch (error) {
    console.error('Rekisteröinti epäonnistui:', error);

    showMessage(
      registerMessage,
      'Rekisteröinti epäonnistui. Käyttäjänimi tai sähköpostiosoite saattaa olla jo käytössä.',
    );
  }
});

// Käyttäjätietojen tallentaminen
profileForm.addEventListener('submit', async (event: SubmitEvent) => {
  event.preventDefault();

  const token = localStorage.getItem('token');

  if (!token) {
    showMessage(
      profileMessage,
      'Kirjaudu sisään ennen tietojen tallentamista.',
    );
    return;
  }

  const updatedUser: UpdateUser = {
    username: profileUsername.value.trim(),
    email: profileEmail.value.trim(),
  };

  try {
    showMessage(profileMessage, 'Tallennetaan tietoja...');

    const result = await fetchData<{ data?: User }>(`${apiUrl}/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedUser),
    });

    if (result.data) {
      showUserData(result.data);
    } else {
      profileUsername.value = updatedUser.username ?? '';
      profileEmail.value = updatedUser.email ?? '';
    }

    showMessage(profileMessage, 'Tiedot tallennettiin onnistuneesti.');
  } catch (error) {
    console.error('Tietojen tallentaminen epäonnistui:', error);
    showMessage(
      profileMessage,
      'Tietojen tallentaminen epäonnistui. Yritä uudelleen.',
    );
  }
});

// Profiilikuvan lataaminen
avatarForm.addEventListener('submit', async (event: SubmitEvent) => {
  event.preventDefault();

  const token = localStorage.getItem('token');

  if (!token || !loggedIn) {
    showMessage(
      avatarMessage,
      'Kirjaudu sisään ennen profiilikuvan vaihtamista.',
    );
    return;
  }

  const file = avatarInput.files?.[0];

  if (!file) {
    showMessage(avatarMessage, 'Valitse ensin profiilikuva.');
    return;
  }

  if (!file.type.startsWith('image/')) {
    showMessage(avatarMessage, 'Valitse kuvatiedosto.');
    return;
  }

  try {
    showMessage(avatarMessage, 'Ladataan profiilikuvaa...');

    const formData = new FormData(avatarForm);

    const avatarResult = await fetchData<UploadResult>(
      `${apiUrl}/users/avatar`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    const updateResult = await fetchData<{ data: User }>(
      `${apiUrl}/users`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar: avatarResult.data.avatar,
        } satisfies UpdateUser),
      },
    );

    showUserData(updateResult.data);
    renderRestaurants();
    renderFavoriteRestaurant();

    avatarForm.reset();

    showMessage(
      avatarMessage,
      'Profiilikuva vaihdettiin onnistuneesti.',
    );
  } catch (error) {
    console.error('Profiilikuvan lataaminen epäonnistui:', error);

    showMessage(
      avatarMessage,
      'Profiilikuvan lataaminen epäonnistui. Yritä uudelleen.',
    );
  }
});

// Käyttäjätilin poistaminen
deleteAccountButton.addEventListener('click', async () => {
  const confirmed = window.confirm(
    'Haluatko varmasti poistaa käyttäjätilisi? Tätä toimintoa ei voi perua.',
  );

  if (!confirmed) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token || !loggedIn) {
    showMessage(
      profileMessage,
      'Kirjaudu sisään ennen käyttäjätilin poistamista.',
    );
    return;
  }

  try {
    showMessage(profileMessage, 'Poistetaan käyttäjätiliä...');
    deleteAccountButton.disabled = true;

    await fetchData<unknown>(`${apiUrl}/users`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    localStorage.removeItem('token');
    loggedIn = false;
    favoriteRestaurantId = null;

    clearAvatarImages();
    updateAccountButton();
    renderRestaurants();
    renderFavoriteRestaurant();

    profileForm.reset();
    avatarForm.reset();
    loginForm.reset();

    showMessage(profileMessage, '');
    showMessage(avatarMessage, '');
    showMessage(registerMessage, '');
    showMessage(loginMessage, '');

    accountForms.hidden = false;
    profilePanel.hidden = true;
    dialogTitle.textContent = 'Kirjaudu sisään tai rekisteröidy';

    accountDialog.close();
    showAccountForms();

    showMessage(
      loginMessage,
      'Käyttäjätilisi poistettiin onnistuneesti.',
    );
  } catch (error) {
    console.error('Käyttäjätilin poistaminen epäonnistui:', error);

    showMessage(
      profileMessage,
      'Käyttäjätilin poistaminen epäonnistui. Yritä uudelleen.',
    );
  } finally {
    deleteAccountButton.disabled = false;
  }
});

// Uloskirjautuminen
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('token');
  loggedIn = false;
  favoriteRestaurantId = null;

  clearAvatarImages();
  updateAccountButton();
  renderRestaurants();
  renderFavoriteRestaurant();

  profileForm.reset();
  avatarForm.reset();

  showMessage(profileMessage, '');
  showMessage(avatarMessage, '');
  showMessage(loginMessage, '');
  showMessage(registerMessage, '');

  accountForms.hidden = false;
  profilePanel.hidden = true;
  dialogTitle.textContent = 'Kirjaudu sisään tai rekisteröidy';

  accountDialog.close();
});

// Täyttää suodattimen vaihtoehdot
const populateFilter = (
  select: HTMLSelectElement,
  values: string[],
  defaultLabel: string,
): void => {
  select.replaceChildren();

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  select.append(defaultOption);

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
};

// Näyttää ruokalistan annokset
const renderCourses = (
  courses: Course[],
  emptyText: string,
): HTMLElement => {
  const container = document.createElement('div');

  if (courses.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = emptyText;
    container.append(emptyMessage);
    return container;
  }

  const list = document.createElement('ul');
  list.className = 'course-list';

  courses.forEach((course) => {
    const item = document.createElement('li');
    item.className = 'course-item';

    const name = document.createElement('h4');
    name.textContent = course.name || 'Nimetön annos';
    item.append(name);

    if (course.price) {
      const price = document.createElement('p');
      price.textContent = `Hinta: ${course.price}`;
      item.append(price);
    }

    const dietText = formatDiets(course.diets);

    if (dietText) {
      const diets = document.createElement('p');
      diets.textContent = `Ruokavaliot: ${dietText}`;
      item.append(diets);
    }

    list.append(item);
  });

  container.append(list);
  return container;
};

// Päivän ruokalistan hakeminen
const showDailyMenu = async (): Promise<void> => {
  if (!selectedRestaurant) {
    showMessage(menuMessage, 'Valitse ravintola.');
    return;
  }

  showMessage(menuMessage, 'Haetaan päivän ruokalistaa...');
  menuContent.replaceChildren();

  try {
    const menu = await fetchData<DailyMenu>(
      `${apiUrl}/restaurants/daily/${selectedRestaurant._id}/fi`,
    );

    const section = document.createElement('section');
    section.className = 'weekly-menu-day';

    const heading = document.createElement('h3');
    heading.textContent = formatDate(new Date());

    section.append(heading);
    section.append(
      renderCourses(
        menu.courses ?? [],
        'Päiväruokalistalla ei ole tällä hetkellä annoksia.',
      ),
    );

    menuContent.append(section);

    showMessage(
      menuMessage,
      `Päivän ruokalista: ${selectedRestaurant.name}`,
    );
  } catch (error) {
    console.error('Päivän ruokalistan hakeminen epäonnistui:', error);

    showMessage(
      menuMessage,
      'Päivän ruokalistan hakeminen epäonnistui. Yritä myöhemmin uudelleen.',
    );
  }
};

// Viikkoruokalistan hakeminen
const showWeeklyMenu = async (): Promise<void> => {
  if (!selectedRestaurant) {
    showMessage(menuMessage, 'Valitse ravintola.');
    return;
  }

  showMessage(menuMessage, 'Haetaan viikon ruokalistaa...');
  menuContent.replaceChildren();

  try {
    const menu = await fetchData<WeeklyMenu>(
      `${apiUrl}/restaurants/weekly/${selectedRestaurant._id}/fi`,
    );

    if (!Array.isArray(menu.days) || menu.days.length === 0) {
      showMessage(menuMessage, 'Viikkoruokalistaa ei ole saatavilla.');
      return;
    }

    menu.days.forEach((day) => {
      const section = document.createElement('section');
      section.className = 'weekly-menu-day';

      const heading = document.createElement('h3');
      heading.textContent = day.date || 'Päivä';

      section.append(heading);
      section.append(
        renderCourses(
          day.courses ?? [],
          'Päiväruokalistalla ei ole tällä hetkellä annoksia.',
        ),
      );

      menuContent.append(section);
    });

    showMessage(
      menuMessage,
      `Viikkoruokalista: ${selectedRestaurant.name}`,
    );
  } catch (error) {
    console.error('Viikkoruokalistan hakeminen epäonnistui:', error);

    showMessage(
      menuMessage,
      'Tämän ravintolan viikkoruokalistaa ei voitu hakea. Kokeile toista ravintolaa tai päivän ruokalistaa.',
    );

    menuContent.replaceChildren();
  }
};

// Tallentaa suosikkiravintolan
const saveFavoriteRestaurant = async (
  restaurant: Restaurant,
): Promise<void> => {
  const token = localStorage.getItem('token');

  if (!token || !loggedIn) {
    showMessage(
      loginMessage,
      'Kirjaudu sisään, jotta voit tallentaa suosikkiravintolan.',
    );
    showAccountForms();
    return;
  }

  if (favoriteRestaurantId === restaurant._id) {
    showMessage(
      menuMessage,
      `${restaurant.name} on jo suosikkiravintolasi.`,
    );
    return;
  }

  const updatedUser: UpdateUser = {
    favouriteRestaurant: restaurant._id,
  };

  try {
    showMessage(
      menuMessage,
      `Tallennetaan suosikkia: ${restaurant.name}...`,
    );

    await fetchData<unknown>(`${apiUrl}/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedUser),
    });

    favoriteRestaurantId = restaurant._id;

    renderRestaurants();
    renderFavoriteRestaurant();

    showMessage(
      menuMessage,
      `${restaurant.name} tallennettiin suosikkiravintolaksesi.`,
    );
  } catch (error) {
    console.error('Suosikkiravintolan tallentaminen epäonnistui:', error);

    showMessage(
      menuMessage,
      'Suosikkiravintolan tallentaminen epäonnistui. Yritä uudelleen.',
    );
  }
};

// Näyttää suodatetut ravintolat
const renderRestaurants = (): void => {
  restaurantList.replaceChildren();

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesCity =
      !cityFilter.value || restaurant.city === cityFilter.value;

    const matchesProvider =
      !providerFilter.value || restaurant.company === providerFilter.value;

    return matchesCity && matchesProvider;
  });

  if (filteredRestaurants.length === 0) {
    const message = document.createElement('p');
    message.textContent =
      'Valituilla suodattimilla ei löytynyt ravintoloita.';
    restaurantList.append(message);
    return;
  }

  filteredRestaurants.forEach((restaurant) => {
    let cardElement: HTMLElement;

    const card = restaurantCard(
      restaurant,
      (chosenRestaurant: Restaurant) => {
        selectedRestaurant = chosenRestaurant;

        restaurantList
          .querySelectorAll('.selected')
          .forEach((element) => element.classList.remove('selected'));

        cardElement.classList.add('selected');

        selectedRestaurantText.textContent =
          `Valittu ravintola: ${chosenRestaurant.name}`;

        showMessage(menuMessage, 'Valitse päivän tai viikon ruokalista.');
        menuContent.replaceChildren();
      },
      favoriteRestaurantId === restaurant._id,
      (chosenRestaurant: Restaurant) => {
        void saveFavoriteRestaurant(chosenRestaurant);
      },
    );

    cardElement = card;
    restaurantList.append(cardElement);

    if (selectedRestaurant?._id === restaurant._id) {
      cardElement.classList.add('selected');
    }
  });
};

// Hakee ravintolat API:lta
const getRestaurants = async (): Promise<void> => {
  showMessage(restaurantList, 'Haetaan ravintoloita...');

  try {
    restaurants = await fetchData<Restaurant[]>(`${apiUrl}/restaurants`);

    const cities = [
      ...new Set(
        restaurants
          .map((restaurant) => restaurant.city)
          .filter((city): city is string => Boolean(city)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'fi'));

    const providers = [
      ...new Set(
        restaurants
          .map((restaurant) => restaurant.company)
          .filter((company): company is string => Boolean(company)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'fi'));

    populateFilter(cityFilter, cities, 'Kaikki kaupungit');
    populateFilter(providerFilter, providers, 'Kaikki palveluntarjoajat');

    renderRestaurants();
    renderFavoriteRestaurant();
  } catch (error) {
    console.error('Ravintoloiden hakeminen epäonnistui:', error);

    showMessage(
      restaurantList,
      'Ravintoloiden hakeminen epäonnistui. Yritä myöhemmin uudelleen.',
    );
  }
};

// Suodattimien tapahtumat
cityFilter.addEventListener('change', renderRestaurants);
providerFilter.addEventListener('change', renderRestaurants);

// Ruokalistojen napit
dailyMenuButton.addEventListener('click', () => {
  void showDailyMenu();
});

weeklyMenuButton.addEventListener('click', () => {
  void showWeeklyMenu();
});

// Käynnistää sovelluksen
void checkToken();
void getRestaurants();