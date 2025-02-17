// React Component displaying different applications versions and license attributions
// List of applications : Editoast, Core, Api

import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { osrdMiddlewareApi } from 'common/api/osrdMiddlewareApi';

import ModalBodySNCF from 'common/BootstrapSNCF/ModalSNCF/ModalBodySNCF';
import ModalHeaderSNCF from 'common/BootstrapSNCF/ModalSNCF/ModalHeaderSNCF';
import { ModalContext } from 'common/BootstrapSNCF/ModalSNCF/ModalProvider';
import osrdLogo from 'assets/pictures/osrd.png';
import './ReleaseInformations.scss';
import LicenseAttributions from './LicenseAttributions';

function ReleaseInformations() {
  const { t } = useTranslation('home/navbar');
  const { data: editoastVersion } = osrdEditoastApi.useGetVersionQuery();
  const { data: coreVersion } = osrdMiddlewareApi.useGetVersionCoreQuery();
  const { data: apiVersion } = osrdMiddlewareApi.useGetVersionApiQuery();
  const { closeModal } = useContext(ModalContext);

  const osrdWebSite = 'https://osrd.fr/';

  function serviceRow(name: string, version?: string | number | null) {
    return (
      <tr>
        <th scope="row">
          <div className="cell-inner">{name}</div>
        </th>
        <td>
          <div className="cell-inner">{version}</div>
        </td>
      </tr>
    );
  }
  return (
    <div className="informations">
      <ModalHeaderSNCF>
        <button type="button" className="close ml-auto" aria-label="Close" onClick={closeModal}>
          <span aria-hidden="true">&times;</span>
        </button>
      </ModalHeaderSNCF>
      <ModalBodySNCF>
        <div className="d-flex flex-column align-items-center mb-4">
          <a href={osrdWebSite} className="mb-4" target="_blank" rel="noreferrer">
            <img src={osrdLogo} alt="OSRD logo" />
          </a>
          <h2>OSRD</h2>
          <h3>Open Source Railway Designer</h3>
        </div>
        <table className="table table-bordered">
          <caption className="sr-only">Titre</caption>
          <thead>
            <tr>
              <th scope="col">
                <div className="cell-inner">{t('informations.application')}</div>
              </th>
              <th scope="col" id="cellfirst-t5">
                <div className="cell-inner">{t('informations.version')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {serviceRow('Editoast', editoastVersion?.git_describe)}
            {serviceRow('Core', coreVersion?.git_describe)}
            {serviceRow('API', apiVersion?.git_describe)}
            {serviceRow('Front', import.meta.env.OSRD_GIT_DESCRIBE)}
          </tbody>
        </table>
        <LicenseAttributions />
      </ModalBodySNCF>
    </div>
  );
}

export default ReleaseInformations;
