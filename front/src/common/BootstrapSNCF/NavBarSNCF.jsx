import { FaPowerOff, FaInfoCircle } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';

import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import React from 'react';
import { logout } from 'reducers/user';
import { useTranslation } from 'react-i18next';
import ReleaseInformations from 'common/ReleaseInformations/ReleaseInformations';
import ChangeLanguageModal from 'common/ChangeLanguageModal';
import i18n from 'i18next';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import { language2flag } from 'utils/strings';
import DropdownSNCF, { DROPDOWN_STYLE_TYPES } from './DropdownSNCF';
import { useModal } from './ModalSNCF';

export default function LegacyNavBarSNCF(props) {
  const { openModal } = useModal();
  const user = useSelector((state) => state.user);
  const { fullscreen } = useSelector((state) => state.main);
  const { appName, logo } = props;
  const dispatch = useDispatch();
  const { t } = useTranslation('home/navbar');

  const toLogout = () => {
    dispatch(logout());
  };

  return (
    <div className={`mastheader${fullscreen ? ' fullscreen' : ''}`}>
      <div className="mastheader-logo flex-grow-0">
        <Link to="/">
          <img alt={appName} src={logo} width="70" />
        </Link>
      </div>
      <header role="banner" className="mastheader-title d-flex flex-grow-1">
        <h1 className="text-white pl-3 mb-0">{appName}</h1>
      </header>
      <ul className="mastheader-toolbar toolbar mb-0">
        <li className="toolbar-item separator-gray-500">
          <DropdownSNCF
            titleContent={
              <>
                <i
                  className="icons-menu-account icons-size-1x25 icons-md-size-1x5 mr-xl-2"
                  aria-hidden="true"
                />
                <span className="d-none d-xl-block">
                  {user.account.firstName} {user.account.lastName}
                </span>
              </>
            }
            type={DROPDOWN_STYLE_TYPES.transparent}
            items={[
              // Button to open modal displaying release version
              <button
                type="button"
                className="btn-link text-reset"
                onClick={() => openModal(<ReleaseInformations />)}
                key="release"
              >
                <span className="mr-2">
                  <FaInfoCircle />
                </span>
                {t('about')}
              </button>,
              <button
                type="button"
                className="btn-link text-reset"
                onClick={() => openModal(<ChangeLanguageModal />, 'sm')}
                key="release"
              >
                <span className="mr-2">
                  {i18n.language && getUnicodeFlagIcon(language2flag(i18n.language))}
                </span>
                {t(`language.${i18n.language}`)}
              </button>,
              <button type="button" className="btn-link text-reset" onClick={toLogout} key="logout">
                <span className="mr-2">
                  <FaPowerOff />
                </span>
                {t('disconnect')}
              </button>,
            ]}
          />
        </li>
      </ul>
    </div>
  );
}

LegacyNavBarSNCF.propTypes = {
  appName: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  logo: PropTypes.string.isRequired,
};
