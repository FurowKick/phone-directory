import { useState, useEffect } from 'react';

function App() {
  const [employees, setEmployees] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [myProfile, setMyProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const fetchEmployees = async (query = '') => {
    if (!token) return;
    setLoading(true);
    try {
      const url = query 
        ? `/api/employees/search?query=${encodeURIComponent(query)}`
        : '/api/employees';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      } else {
        if (res.status === 401) {
          setToken('');
          localStorage.removeItem('authToken');
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await fetch('/api/employees/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setMyProfile({
          ...profile,
          fullName: `${profile.lastName} ${profile.firstName} ${profile.middleName || ''}`.trim()
        });
      } else {
        setMyProfile(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setMyProfile(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить сотрудника?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEmployees(searchQuery);
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const handleUpdateEmployee = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const updated = Object.fromEntries(formData);

  let res;

  if (userRole === 'Admin') {
    // Админ редактирует по ID
    const id = updated.id;
    delete updated.id;
    res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updated)
    });
  } else {
    // Обычный пользователь редактирует себя — без ID
    delete updated.id;
    res = await fetch('/api/employees/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updated)
    });
  }

  if (res.ok) {
    setEditingEmployee(null);
    fetchEmployees(searchQuery);
    alert('Анкета обновлена!');
  } else {
    const errorText = await res.text();
    console.error('Ошибка сервера:', errorText);
    alert('Ошибка обновления: ' + (errorText || 'неизвестно'));
  }
};

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        setUserRole(data.role);
      } else {
        alert('Неверный логин или пароль');
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      alert('Не удалось подключиться к серверу');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const model = Object.fromEntries(formData);
    if (!model.username || !model.password || !model.firstName || !model.lastName) {
      alert('Заполните обязательные поля: логин, пароль, имя, фамилия');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model)
      });
      if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        e.target.reset();
      } else {
        const error = await res.text();
        alert('Ошибка регистрации: ' + (error || 'неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      alert('Не удалось подключиться к серверу');
    }
  };

  useEffect(() => {
    if (token) {
      const jwtData = parseJwt(token);
      const role = jwtData?.role || 'Subscriber';
      setUserRole(role);
      fetchEmployees(searchQuery);
      fetchMyProfile();
    }
  }, [token, searchQuery]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emp = Object.fromEntries(formData);

    if (!emp.login || !emp.password) {
      delete emp.login;
      delete emp.password;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        e.target.reset();
        fetchEmployees(searchQuery);
        alert('Сотрудник и аккаунт созданы!');
      } else {
        const error = await res.text();
        alert('Ошибка: ' + (error || 'не удалось добавить сотрудника'));
      }
    } catch (err) {
      console.error('Ошибка добавления сотрудника:', err);
      alert('Не удалось подключиться к серверу');
    }
  };

  const canEdit = (employee) => {
    if (userRole === 'Admin') return true;
    if (myProfile && employee.id === myProfile.id) return true;
    return false;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🏢 Телефонный справочник предприятия</h1>

      {!token ? (
        <div>
          <div>
            <h2>🔐 Вход в систему</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input name="username" placeholder="Логин" required />
              <input name="password" placeholder="Пароль" type="password" required />
              <button type="submit">Войти</button>
            </form>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h2>📝 Регистрация нового сотрудника</h2>
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              <input name="username" placeholder="Логин *" required />
              <input name="password" placeholder="Пароль *" type="password" required />
              <input name="lastName" placeholder="Фамилия *" required />
              <input name="firstName" placeholder="Имя *" required />
              <input name="middleName" placeholder="Отчество" />
              <input name="email" placeholder="Email" type="email" />
              <input name="position" placeholder="Должность" />
              <input name="department" placeholder="Подразделение" />
              <input name="building" placeholder="Корпус" />
              <input name="officeNumber" placeholder="Кабинет" />
              <input name="internalPhone" placeholder="Внутр. телефон" />
              <input name="cityPhone" placeholder="Городской телефон" />
              <input name="mobilePhone" placeholder="Мобильный телефон" />
              <input name="address" placeholder="Адрес проживания" style={{ gridColumn: 'span 2' }} />
              <button type="submit" style={{ gridColumn: 'span 2' }}>Зарегистрироваться</button>
            </form>
          </div>

          <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
            Для администратора: <code>admin</code> / <code>admin123</code>
          </p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <span>Вы вошли как: <strong>{userRole === 'Admin' ? 'Администратор' : 'Абонент'}</strong></span>
            {' | '}
            <button onClick={() => {
              setToken('');
              setUserRole('');
              localStorage.removeItem('authToken');
            }}>Выйти</button>
          </div>

          <input
            placeholder="🔍 Поиск по ФИО, должности, подразделению или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: '15px', padding: '8px', width: '100%', maxWidth: '500px' }}
          />

          {userRole === 'Admin' && myProfile && (
            <div style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <h3>👤 Администратор</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '14px' }}>
                <div><strong>ФИО:</strong> {myProfile.fullName}</div>
                <div><strong>Email:</strong> {myProfile.email || '—'}</div>
              </div>
            </div>
          )}

          {userRole === 'Admin' && (
            <>
              <details style={{ marginBottom: '20px' }}>
                <summary>➕ Добавить сотрудника</summary>
                <form onSubmit={handleAddEmployee} style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: '10px' }}>
                  <input name="lastName" placeholder="Фамилия" required />
                  <input name="firstName" placeholder="Имя" required />
                  <input name="middleName" placeholder="Отчество" />
                  <input name="position" placeholder="Должность" />
                  <input name="department" placeholder="Подразделение" />
                  <input name="building" placeholder="Корпус" />
                  <input name="officeNumber" placeholder="Кабинет" />
                  <input name="internalPhone" placeholder="Внутр. телефон" />
                  <input name="cityPhone" placeholder="Городской" />
                  <input name="mobilePhone" placeholder="Мобильный" />
                  <input name="email" placeholder="Email" type="email" />
                  <input name="address" placeholder="Адрес проживания" style={{ gridColumn: 'span 2' }} />

                  <input name="login" placeholder="Логин (для входа)" />
                  <input name="password" placeholder="Пароль (для входа)" type="password" />

                  <button type="submit" style={{ gridColumn: 'span 2' }}>Добавить и создать аккаунт</button>
                </form>
              </details>

              <h2>📋 Все сотрудники ({employees.length})</h2>
              {loading ? (
                <p>Загрузка...</p>
              ) : (
                <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>ФИО</th>
                      <th>Должность</th>
                      <th>Подразделение</th>
                      <th>Корпус / Каб.</th>
                      <th>Контакты</th>
                      <th>Адрес</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>{`${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`}</td>
                        <td>{emp.position || '—'}</td>
                        <td>{emp.department || '—'}</td>
                        <td>{emp.building || '—'}, {emp.officeNumber || '—'}</td>
                        <td>
                          📞 Внутр: {emp.internalPhone || '—'}<br/>
                          🏢 Гор: {emp.cityPhone || '—'}<br/>
                          📱 Моб: {emp.mobilePhone || '—'}<br/>
                          📧 {emp.email || '—'}
                        </td>
                        <td>{emp.address || '—'}</td>
                        <td>
                          {canEdit(emp) && (
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginRight: '5px'
                              }}
                            >
                              Редактировать
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(emp.id)}
                            style={{
                              backgroundColor: '#ff4d4d',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {userRole === 'Subscriber' && (
            <>
              <h2>📋 Справочник сотрудников ({employees.length})</h2>
              {loading ? (
                <p>Загрузка...</p>
              ) : (
                <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>ФИО</th>
                      <th>Должность</th>
                      <th>Подразделение</th>
                      <th>Корпус / Каб.</th>
                      <th>Контакты</th>
                      <th>Адрес</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>{`${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`}</td>
                        <td>{emp.position || '—'}</td>
                        <td>{emp.department || '—'}</td>
                        <td>{emp.building || '—'}, {emp.officeNumber || '—'}</td>
                        <td>
                          📞 Внутр: {emp.internalPhone || '—'}<br/>
                          🏢 Гор: {emp.cityPhone || '—'}<br/>
                          📱 Моб: {emp.mobilePhone || '—'}<br/>
                          📧 {emp.email || '—'}
                        </td>
                        <td>{emp.address || '—'}</td>
                        <td>
                          {canEdit(emp) && (
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Редактировать
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
          {editingEmployee && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              padding: '20px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              zIndex: 1000,
              width: '90%',
              maxWidth: '600px'
            }}>
              <h3>✏️ Редактирование анкеты: {editingEmployee.lastName} {editingEmployee.firstName}</h3>
              <form onSubmit={handleUpdateEmployee} style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                <input name="id" defaultValue={editingEmployee.id} type="hidden" />
                <input name="lastName" defaultValue={editingEmployee.lastName} placeholder="Фамилия" required />
                <input name="firstName" defaultValue={editingEmployee.firstName} placeholder="Имя" required />
                <input name="middleName" defaultValue={editingEmployee.middleName || ''} placeholder="Отчество" />
                <input name="position" defaultValue={editingEmployee.position || ''} placeholder="Должность" />
                <input name="department" defaultValue={editingEmployee.department || ''} placeholder="Подразделение" />
                <input name="building" defaultValue={editingEmployee.building || ''} placeholder="Корпус" />
                <input name="officeNumber" defaultValue={editingEmployee.officeNumber || ''} placeholder="Кабинет" />
                <input name="internalPhone" defaultValue={editingEmployee.internalPhone || ''} placeholder="Внутр. телефон" />
                <input name="cityPhone" defaultValue={editingEmployee.cityPhone || ''} placeholder="Городской" />
                <input name="mobilePhone" defaultValue={editingEmployee.mobilePhone || ''} placeholder="Мобильный" />
                <input name="email" defaultValue={editingEmployee.email || ''} placeholder="Email" type="email" style={{ gridColumn: 'span 2' }} />
                <input name="address" defaultValue={editingEmployee.address || ''} placeholder="Адрес проживания" style={{ gridColumn: 'span 2' }} />
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button type="submit">Сохранить изменения</button>
                  <button type="button" onClick={() => setEditingEmployee(null)}>Отмена</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;